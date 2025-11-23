import dotenv from "dotenv";
import path from "path";
import {
  rpc,
  Keypair,
  TransactionBuilder,
  BASE_FEE,
  Contract,
  scValToNative,
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

async function getAndDecryptBalance(
  userAddress: string,
  userIndexHex: string
) {
  console.log("\n" + "=".repeat(70));
  console.log("🔍 GETTING AND DECRYPTING USER BALANCE");
  console.log("=".repeat(70));
  console.log(`User Address: ${userAddress}`);
  console.log(`User Index: ${userIndexHex}`);
  console.log("");

  const server = new rpc.Server(config.rpcUrl, {
    allowHttp: config.rpcUrl.startsWith("http://"),
  });
  const serverKeypair = Keypair.fromSecret(config.serverSecretKey);
  const contract = new Contract(config.contractId);

  try {
    // Step 1: Get encrypted balance from contract
    console.log("📥 Step 1: Fetching encrypted balance from contract...");

    const sourceAccount = await server.getAccount(serverKeypair.publicKey());

    // Convert user index to BytesN<32>
    const userIndexBuffer = userIndexHex.startsWith("0x")
      ? Buffer.from(userIndexHex.slice(2), "hex")
      : Buffer.from(userIndexHex, "hex");

    const operation = contract.call(
      "get_encrypted_balance",
      nativeToScVal(userIndexBuffer, { type: "bytes" })
    );

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    // Simulate the transaction
    const simulateResponse = await server.simulateTransaction(transaction);

    if (rpc.Api.isSimulationError(simulateResponse)) {
      throw new Error(
        `Simulation error: ${JSON.stringify(simulateResponse, null, 2)}`
      );
    }

    const result = simulateResponse.result?.retval;
    if (!result) {
      console.error("❌ No encrypted balance found for this user index");
      return;
    }

    // Parse the EncryptedBalance struct
    const encryptedBalance = scValToNative(result);

    if (!encryptedBalance.exists) {
      console.error("❌ No balance exists for this user index");
      return;
    }

    console.log("✅ Encrypted balance retrieved!");
    console.log("");

    // Display encrypted data
    console.log("🔒 ENCRYPTED DATA:");
    console.log("─".repeat(70));
    console.log(
      `Encrypted Amount: ${Buffer.from(encryptedBalance.encrypted_amount).toString("hex").substring(0, 64)}...`
    );
    console.log(
      `   Length: ${Buffer.from(encryptedBalance.encrypted_amount).length} bytes`
    );
    console.log(
      `Encrypted Key (User): ${Buffer.from(encryptedBalance.encrypted_key_user).toString("hex").substring(0, 64)}...`
    );
    console.log(
      `   Length: ${Buffer.from(encryptedBalance.encrypted_key_user).length} bytes`
    );
    console.log(
      `Encrypted Key (Server): ${Buffer.from(encryptedBalance.encrypted_key_server).toString("hex").substring(0, 64)}...`
    );
    console.log(
      `   Length: ${Buffer.from(encryptedBalance.encrypted_key_server).length} bytes`
    );
    console.log(
      `Timestamp: ${new Date(Number(encryptedBalance.timestamp) * 1000).toISOString()}`
    );
    console.log("");

    // Step 2: Decrypt the balance using server's private key
    console.log("🔓 Step 2: Decrypting balance...");
    console.log("");

    // Decrypt the symmetric key using server's private key
    const encryptedKeyForServer = Buffer.from(
      encryptedBalance.encrypted_key_server
    );
    const symmetricKey = EncryptionService.decryptSymmetricKeyForAddress(
      encryptedKeyForServer,
      serverKeypair.secret()
    );

    console.log(
      `   ✅ Symmetric key decrypted: ${symmetricKey.toString("hex").substring(0, 32)}...`
    );

    // Decrypt the balance using the symmetric key
    const encryptedAmount = Buffer.from(encryptedBalance.encrypted_amount);
    const decryptedBalance = EncryptionService.decryptWithSymmetricKey(
      encryptedAmount,
      symmetricKey
    );

    console.log("");
    console.log("💰 DECRYPTED BALANCE:");
    console.log("=".repeat(70));
    console.log(`   ${decryptedBalance} stroops`);
    console.log(`   ${(Number(BigInt(decryptedBalance)) / 10000000).toFixed(7)} XLM`);
    console.log("=".repeat(70));
    console.log("");

    // Summary
    console.log("📊 SUMMARY:");
    console.log("─".repeat(70));
    console.log(`User Address: ${userAddress}`);
    console.log(`User Index: ${userIndexHex}`);
    console.log(`Balance (encrypted): ${encryptedAmount.toString("hex").substring(0, 32)}...`);
    console.log(`Balance (decrypted): ${decryptedBalance} stroops`);
    console.log(`Balance (XLM): ${(Number(BigInt(decryptedBalance)) / 10000000).toFixed(7)} XLM`);
    console.log("─".repeat(70));
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log("\nUsage: npx tsx get-balance.ts <user_address> <user_index_hex>");
  console.log("\nExample:");
  console.log(
    "  npx tsx get-balance.ts GBGHDHW642US2JAZ6F7ARNHKN7U53JCZPGLTY4EWNKCWIKG6VRZTP36O 0x1111111111111111111111111111111111111111111111111111111111111111"
  );
  console.log("");
  process.exit(1);
}

const userAddress = args[0];
const userIndexHex = args[1];

// Run the function
getAndDecryptBalance(userAddress, userIndexHex)
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
