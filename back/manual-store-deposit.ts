import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Keypair,
  nativeToScVal,
  Address,
} from "@stellar/stellar-sdk";
import * as rpc from "@stellar/stellar-sdk/rpc";
import { Server as SorobanServer } from "@stellar/stellar-sdk/rpc";
import * as crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const SERVER_PUBLIC_KEY = "GDRPFW33SYQ5F663QSIMWKDARNUC54AYJ34KHIT4JEREPFPYL4ECFKYO";
const SERVER_SECRET = process.env.SOURCE_SECRET_KEY!;

// Encryption functions
class EncryptionService {
  static encryptSymmetricKeyForAddress(
    symmetricKey: Buffer,
    stellarAddress: string
  ): Buffer {
    const publicKeyBytes = Address.fromString(stellarAddress).toBuffer();
    const hash = crypto.createHash("sha256").update(publicKeyBytes).digest();
    const cipher = crypto.createCipheriv("aes-256-gcm", hash, Buffer.alloc(12));
    const encrypted = Buffer.concat([
      cipher.update(symmetricKey),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([encrypted, authTag]);
  }

  static encryptBalanceWithSymmetricKey(
    balance: bigint,
    symmetricKey: Buffer
  ): Buffer {
    const balanceStr = balance.toString();
    const balanceBuffer = Buffer.from(balanceStr, "utf8");
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", symmetricKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(balanceBuffer),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, encrypted, authTag]);
  }
}

async function manualStoreDeposit(
  userAddress: string,
  userIndex: string,
  amount: string
) {
  console.log("\n======================================================================");
  console.log("💾 MANUAL STORE DEPOSIT");
  console.log("======================================================================");
  console.log(`User Address: ${userAddress}`);
  console.log(`User Index: ${userIndex}`);
  console.log(`Amount: ${amount}`);
  console.log("");

  const rpcUrl = process.env.STELLAR_RPC_URL!;
  const networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE!;
  const contractId = process.env.CONTRACT_ID!;

  const server = new SorobanServer(rpcUrl, { allowHttp: true });
  const serverKeypair = Keypair.fromSecret(SERVER_SECRET);
  const contract = new Contract(contractId);

  // Step 1: Generate symmetric key
  console.log("🔑 Step 1: Generating symmetric key...");
  const symmetricKey = crypto.randomBytes(32);
  console.log(`   Generated key: ${symmetricKey.length} bytes`);

  // Step 2: Encrypt balance
  console.log("\n🔒 Step 2: Encrypting balance...");
  const balanceAmount = BigInt(amount);
  const encryptedBalance = EncryptionService.encryptBalanceWithSymmetricKey(
    balanceAmount,
    symmetricKey
  );
  console.log(`   Encrypted balance: ${encryptedBalance.length} bytes`);

  // Step 3: Encrypt symmetric key for user
  console.log("\n🔐 Step 3: Encrypting key for user...");
  const encryptedKeyForUser = EncryptionService.encryptSymmetricKeyForAddress(
    symmetricKey,
    userAddress
  );
  console.log(`   Encrypted key for user: ${encryptedKeyForUser.length} bytes`);

  // Step 4: Encrypt symmetric key for server
  console.log("\n🔐 Step 4: Encrypting key for server...");
  const encryptedKeyForServer = EncryptionService.encryptSymmetricKeyForAddress(
    symmetricKey,
    SERVER_PUBLIC_KEY
  );
  console.log(`   Encrypted key for server: ${encryptedKeyForServer.length} bytes`);

  // Step 5: Generate request ID
  console.log("\n🔑 Step 5: Generating request ID...");
  const userIndexBuffer = Buffer.from(userIndex.replace("0x", ""), "hex");
  const requestIdInput = Buffer.concat([
    userIndexBuffer,
    Buffer.from(Date.now().toString()),
  ]);
  const requestId = crypto.createHash("sha256").update(requestIdInput).digest();
  console.log(`   Request ID: 0x${requestId.toString("hex")}`);

  // Step 6: Call store_deposit
  console.log("\n📝 Step 6: Calling store_deposit on contract...");

  try {
    const operation = contract.call(
      "store_deposit",
      nativeToScVal(requestId, { type: "bytes" }),
      nativeToScVal(userAddress, { type: "address" }),
      nativeToScVal(balanceAmount, { type: "i128" }),
      nativeToScVal(userIndexBuffer, { type: "bytes" }),
      nativeToScVal(encryptedBalance, { type: "bytes" }),
      nativeToScVal(encryptedKeyForUser, { type: "bytes" }),
      nativeToScVal(encryptedKeyForServer, { type: "bytes" })
    );

    const sourceAccount = await server.getAccount(serverKeypair.publicKey());

    let transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    console.log("   🔍 Simulating transaction...");
    const simulated = await server.simulateTransaction(transaction);

    if ("error" in simulated && simulated.error) {
      console.error("❌ Simulation failed:", simulated.error);
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    console.log("   ✅ Simulation successful");

    const assembledTx = rpc.assembleTransaction(transaction, simulated).build();
    assembledTx.sign(serverKeypair);

    console.log("   📤 Submitting transaction...");
    const sendResponse = await server.sendTransaction(assembledTx);

    if (sendResponse.status === "PENDING") {
      console.log("   ⏳ Transaction pending, waiting for confirmation...");

      let getResponse = await server.getTransaction(sendResponse.hash);
      let attempts = 0;
      const maxAttempts = 20;

      while (getResponse.status === "NOT_FOUND" && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        getResponse = await server.getTransaction(sendResponse.hash);
        attempts++;
      }

      if (getResponse.status === "SUCCESS") {
        console.log("\n✅ SUCCESS!");
        console.log("======================================================================");
        console.log(`Transaction hash: ${sendResponse.hash}`);
        console.log(`Deposit stored for user ${userAddress}`);
        console.log(`Amount: ${amount} stroops (${Number(amount) / 10000000} XLM)`);
        console.log("======================================================================");
      } else {
        console.error("❌ Transaction failed:", getResponse);
      }
    } else if (sendResponse.status === "ERROR") {
      console.error("❌ Transaction error:", sendResponse);
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 3) {
  console.error("Usage: npx tsx manual-store-deposit.ts <USER_ADDRESS> <USER_INDEX_HEX> <AMOUNT>");
  console.error("Example: npx tsx manual-store-deposit.ts GBGHD... 0x1111... 5000000");
  process.exit(1);
}

const [userAddress, userIndex, amount] = args;

manualStoreDeposit(userAddress, userIndex, amount)
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });
