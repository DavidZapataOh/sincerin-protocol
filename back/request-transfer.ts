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
  serverSecretKey: process.env.SOURCE_SECRET_KEY || "",
};

async function requestTransfer(
  senderKeyName: string,
  receiverIndexHex: string,
  amount: string
) {
  console.log("\n" + "=".repeat(70));
  console.log("🔄 REQUESTING TRANSFER");
  console.log("=".repeat(70));
  console.log(`Sender: ${senderKeyName}`);
  console.log(`Receiver Index: ${receiverIndexHex}`);
  console.log(`Amount: ${amount} stroops`);
  console.log("");

  const server = new rpc.Server(config.rpcUrl, {
    allowHttp: config.rpcUrl.startsWith("http://"),
  });

  // Get server keypair for encryption
  const serverKeypair = Keypair.fromSecret(config.serverSecretKey);
  const serverAddress = serverKeypair.publicKey();

  // Get sender's keypair from stellar keys
  const { execSync } = require("child_process");
  const senderSecret = execSync(`stellar keys show ${senderKeyName}`)
    .toString()
    .trim();
  const senderKeypair = Keypair.fromSecret(senderSecret);

  try {
    console.log("🔐 Step 1: Encrypting transfer data for server...");
    console.log("");

    // Encrypt receiver index for server
    const receiverIndexBuffer = receiverIndexHex.startsWith("0x")
      ? Buffer.from(receiverIndexHex.slice(2), "hex")
      : Buffer.from(receiverIndexHex, "hex");

    const encryptedReceiverIndex =
      EncryptionService.encryptSymmetricKeyForAddress(
        receiverIndexBuffer,
        serverAddress
      );

    console.log(
      `   ✅ Encrypted receiver index: ${encryptedReceiverIndex
        .toString("hex")
        .substring(0, 32)}...`
    );

    // Encrypt amount for server
    const encryptedAmount = EncryptionService.encryptSymmetricKeyForAddress(
      Buffer.from(amount),
      serverAddress
    );

    console.log(
      `   ✅ Encrypted amount: ${encryptedAmount
        .toString("hex")
        .substring(0, 32)}...`
    );
    console.log("");

    console.log("📤 Step 2: Calling request_transfer on contract...");
    console.log("");

    const contract = new Contract(config.contractId);
    const sourceAccount = await server.getAccount(senderKeypair.publicKey());
    console.log({
      address: senderKeypair.publicKey(),
      encryptedReceiverIndex,
      encryptedAmount,
    });
    const operation = contract.call(
      "request_transfer",
      nativeToScVal(senderKeypair.publicKey(), { type: "address" }),
      nativeToScVal(encryptedReceiverIndex, { type: "bytes" }),
      nativeToScVal(encryptedAmount, { type: "bytes" })
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

    // Sign the assembled transaction with sender's keypair
    assembled.sign(senderKeypair);

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

      console.log("📊 TRANSFER REQUEST SUMMARY:");
      console.log("─".repeat(70));
      console.log(`Sender: ${senderKeypair.publicKey()}`);
      console.log(`Receiver Index: ${receiverIndexHex}`);
      console.log(`Amount: ${amount} stroops`);
      console.log(
        `Amount (XLM): ${(Number(amount) / 10000000).toFixed(7)} XLM`
      );
      console.log(
        `Encrypted Receiver Index: ${encryptedReceiverIndex
          .toString("hex")
          .substring(0, 32)}...`
      );
      console.log(
        `Encrypted Amount: ${encryptedAmount
          .toString("hex")
          .substring(0, 32)}...`
      );
      console.log("─".repeat(70));
      console.log("");
      console.log(
        "🎯 Server will now process this transfer and update both balances!"
      );
    } else {
      console.error(
        "   ❌ Transaction failed:"
        //JSON.stringify(getResponse, null, 2)
      );
    }
  } catch (error: any) {
    console.log("error 1");
    //console.error("❌ Error:", error.message);
    if (error.stack) {
      console.log("error 2");
      //console.error(error.stack);
    }
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.log(
    "\nUsage: npx tsx request-transfer.ts <sender_key_name> <receiver_index_hex> <amount>"
  );
  console.log("\nExample:");
  console.log(
    "  npx tsx request-transfer.ts alice 0x2222222222222222222222222222222222222222222222222222222222222222 1000000"
  );
  console.log(
    "\nThis will transfer 1,000,000 stroops (0.1 XLM) from alice to the user with index 0x2222..."
  );
  console.log("");
  process.exit(1);
}

const senderKeyName = args[0];
const receiverIndexHex = args[1];
const amount = args[2];

// Run the function
requestTransfer(senderKeyName, receiverIndexHex, amount)
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
