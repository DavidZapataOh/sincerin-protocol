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

interface UserBalance {
  userIndex: string;
  address: string;
  balance: string;
  balanceXLM: string;
  exists: boolean;
}

async function getBalanceForUser(
  userAddress: string,
  userIndexHex: string
): Promise<UserBalance> {
  const server = new rpc.Server(config.rpcUrl, {
    allowHttp: config.rpcUrl.startsWith("http://"),
  });
  const serverKeypair = Keypair.fromSecret(config.serverSecretKey);
  const contract = new Contract(config.contractId);

  try {
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
      return {
        userIndex: userIndexHex,
        address: userAddress,
        balance: "0",
        balanceXLM: "0.0000000",
        exists: false,
      };
    }

    // Parse the EncryptedBalance struct
    const encryptedBalance = scValToNative(result);

    if (!encryptedBalance.exists) {
      return {
        userIndex: userIndexHex,
        address: userAddress,
        balance: "0",
        balanceXLM: "0.0000000",
        exists: false,
      };
    }

    // Decrypt the symmetric key using server's private key
    const encryptedKeyForServer = Buffer.from(
      encryptedBalance.encrypted_key_server
    );
    const symmetricKey = EncryptionService.decryptSymmetricKeyForAddress(
      encryptedKeyForServer,
      serverKeypair.secret()
    );

    // Decrypt the balance using the symmetric key
    const encryptedAmount = Buffer.from(encryptedBalance.encrypted_amount);
    const decryptedBalance = EncryptionService.decryptWithSymmetricKey(
      encryptedAmount,
      symmetricKey
    );

    const balanceXLM = (Number(BigInt(decryptedBalance)) / 10000000).toFixed(7);

    return {
      userIndex: userIndexHex,
      address: userAddress,
      balance: decryptedBalance,
      balanceXLM: balanceXLM,
      exists: true,
    };
  } catch (error: any) {
    console.error(`Error getting balance for ${userAddress}:`, error.message);
    return {
      userIndex: userIndexHex,
      address: userAddress,
      balance: "0",
      balanceXLM: "0.0000000",
      exists: false,
    };
  }
}

async function checkAllBalances() {
  console.log("\n" + "=".repeat(70));
  console.log("💰 CHECKING ALL USER BALANCES");
  console.log("=".repeat(70));
  console.log("");

  // Get addresses from stellar keys
  const { execSync } = require("child_process");

  let aliceAddress: string;
  let bobAddress: string;

  try {
    aliceAddress = execSync("stellar keys address alice").toString().trim();
  } catch (error) {
    console.error("❌ Alice key not found. Please generate it first:");
    console.error("   stellar keys generate alice --network testnet");
    process.exit(1);
  }

  try {
    bobAddress = execSync("stellar keys address bob").toString().trim();
  } catch (error) {
    console.error("❌ Bob key not found. Please generate it first:");
    console.error("   stellar keys generate bob --network testnet");
    process.exit(1);
  }

  console.log("👤 Users:");
  console.log(`   Alice: ${aliceAddress}`);
  console.log(`   Bob:   ${bobAddress}`);
  console.log("");

  console.log("🔍 Fetching encrypted balances from blockchain...");
  console.log("");

  // Alice's user index (0x1111...)
  const aliceIndex =
    "0x1111111111111111111111111111111111111111111111111111111111111111";
  // Bob's user index (0x2222...)
  const bobIndex =
    "0x2222222222222222222222222222222222222222222222222222222222222222";

  const [aliceBalance, bobBalance] = await Promise.all([
    getBalanceForUser(aliceAddress, aliceIndex),
    getBalanceForUser(bobAddress, bobIndex),
  ]);

  console.log("📊 BALANCES:");
  console.log("=".repeat(70));
  console.log("");

  // Alice's balance
  console.log("👤 Alice (User A)");
  console.log("─".repeat(70));
  console.log(`   Address: ${aliceBalance.address}`);
  console.log(`   User Index: ${aliceBalance.userIndex}`);
  if (aliceBalance.exists) {
    console.log(`   Balance: ${aliceBalance.balance} stroops`);
    console.log(`   Balance: ${aliceBalance.balanceXLM} XLM`);
    console.log(`   Status: ✅ Active`);
  } else {
    console.log(`   Balance: No balance found`);
    console.log(`   Status: ⚠️  Not initialized`);
  }
  console.log("");

  // Bob's balance
  console.log("👤 Bob (User B)");
  console.log("─".repeat(70));
  console.log(`   Address: ${bobBalance.address}`);
  console.log(`   User Index: ${bobBalance.userIndex}`);
  if (bobBalance.exists) {
    console.log(`   Balance: ${bobBalance.balance} stroops`);
    console.log(`   Balance: ${bobBalance.balanceXLM} XLM`);
    console.log(`   Status: ✅ Active`);
  } else {
    console.log(`   Balance: No balance found`);
    console.log(`   Status: ⚠️  Not initialized`);
  }
  console.log("");

  // Summary
  console.log("📈 SUMMARY:");
  console.log("=".repeat(70));
  const totalStroops =
    Number(BigInt(aliceBalance.balance)) + Number(BigInt(bobBalance.balance));
  const totalXLM = (totalStroops / 10000000).toFixed(7);
  console.log(`   Total Balance: ${totalStroops} stroops`);
  console.log(`   Total Balance: ${totalXLM} XLM`);
  console.log(`   Active Users: ${[aliceBalance.exists, bobBalance.exists].filter(Boolean).length}/2`);
  console.log("=".repeat(70));
}

// Run the function
checkAllBalances()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
