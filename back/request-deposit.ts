import dotenv from "dotenv";
import path from "path";
import {
  rpc,
  Keypair,
  TransactionBuilder,
  BASE_FEE,
  Contract,
  nativeToScVal,
} from "@stellar/stellar-sdk";
import { EncryptionService } from "./src/services/EncryptionService";

// Load environment variables from back/.env
dotenv.config({ path: path.join(__dirname, ".env") });

const config = {
  rpcUrl: process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org",
  networkPassphrase:
    process.env.STELLAR_NETWORK_PASSPHRASE ||
    "Test SDF Network ; September 2015",
  contractId: process.env.CONTRACT_ID || "",
};

async function requestDeposit(
  userKeyName: string,
  userIndexHex: string,
  amount: string
) {
  console.log("\n" + "=".repeat(70));
  console.log("💰 REQUESTING DEPOSIT");
  console.log("=".repeat(70));
  console.log(`User: ${userKeyName}`);
  console.log(`User Index: ${userIndexHex}`);
  console.log(`Amount: ${amount} stroops`);
  console.log("");

  const server = new rpc.Server(config.rpcUrl, {
    allowHttp: config.rpcUrl.startsWith("http://"),
  });

  // Get user's keypair from stellar keys
  const { execSync } = require("child_process");
  const userSecret = execSync(`stellar keys show ${userKeyName}`)
    .toString()
    .trim();
  const userKeypair = Keypair.fromSecret(userSecret);

  try {
    console.log("🔐 Step 1: Preparing encrypted index...");
    console.log("");

    // Prepare encrypted index as bytes
    const userIndexBuffer = userIndexHex.startsWith("0x")
      ? Buffer.from(userIndexHex.slice(2), "hex")
      : Buffer.from(userIndexHex, "hex");

    console.log(`   ✅ User index ready: ${userIndexHex.substring(0, 32)}...`);
    console.log("");

    console.log("📤 Step 2: Calling request_deposit on contract...");
    console.log("");

    const contract = new Contract(config.contractId);
    const sourceAccount = await server.getAccount(userKeypair.publicKey());

    const operation = contract.call(
      "request_deposit",
      nativeToScVal(userKeypair.publicKey(), { type: "address" }),
      nativeToScVal(amount, { type: "i128" }),
      nativeToScVal(userIndexBuffer, { type: "bytes" })
    );

    let transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    console.log("   🔍 Simulating transaction...");

    // Simulate the transaction first
    const simulated = await server.simulateTransaction(transaction);

    if (rpc.Api.isSimulationError(simulated)) {
      console.error("   ❌ Simulation failed:", simulated.error);
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    console.log("   ✅ Simulation successful");

    // Assemble the transaction with simulation results
    const assembled = rpc.assembleTransaction(transaction, simulated).build();

    // Sign the assembled transaction with user's keypair
    assembled.sign(userKeypair);

    console.log("   📡 Submitting transaction...");

    // Submit the transaction
    const response = await server.sendTransaction(assembled);

    console.log(
      `   ✅ Transaction submitted! Hash: ${response.hash.substring(0, 16)}...`
    );
    console.log("");

    // Wait for the transaction to be included in a ledger
    console.log("⏳ Step 3: Waiting for transaction confirmation...");

    let getResponse = await server.getTransaction(response.hash);
    while (getResponse.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      getResponse = await server.getTransaction(response.hash);
    }

    if (getResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      console.log("   ✅ Transaction confirmed!");
      console.log("");

      console.log("📊 DEPOSIT REQUEST SUMMARY:");
      console.log("─".repeat(70));
      console.log(`User: ${userKeypair.publicKey()}`);
      console.log(`User Index: ${userIndexHex}`);
      console.log(`Amount: ${amount} stroops`);
      console.log(
        `Amount (XLM): ${(Number(amount) / 10000000).toFixed(7)} XLM`
      );
      console.log("─".repeat(70));
      console.log("");
      console.log(
        "🎯 Server will now process this deposit and store encrypted balance!"
      );
    } else {
      console.error(
        "   ❌ Transaction failed:",
        JSON.stringify(getResponse, null, 2)
      );
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log(
    "\nUsage: npx tsx request-deposit.ts <user_key_name> <user_index_hex> <amount>"
  );
  console.log("\nExample:");
  console.log(
    "  npx tsx request-deposit.ts alice 0x1111111111111111111111111111111111111111111111111111111111111111 5000000"
  );
  console.log(
    "\nThis will request a deposit of 5,000,000 stroops (0.5 XLM) for alice."
  );
  console.log(
    "The server will detect the event and store the encrypted balance."
  );
  console.log("");
  process.exit(1);
}

const userKeyName = args[0];
const userIndexHex = args[1];
const amount = args[2];

// Run the function
requestDeposit(userKeyName, userIndexHex, amount)
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
