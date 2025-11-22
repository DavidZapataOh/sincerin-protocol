import {
  rpc,
  Keypair,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Contract,
  xdr,
  scValToNative,
  nativeToScVal,
  Address,
} from "@stellar/stellar-sdk";
import { EncryptionService } from "./EncryptionService";
import { ParsedEvent, StellarConfig } from "../types";
import { StellarUtils } from "../utils/stellar";

interface DepositEventData {
  requestId: string;
  user: string;
  amount: bigint;
  timestamp: bigint;
  ledger: number;
  encryptedIndex: Buffer;
}

export class StellarEncryptedTokenService {
  private server: rpc.Server;
  private serverKeypair: Keypair;
  private networkPassphrase: string;
  private contractId: string;

  // In-memory storage (use database in production)
  private userSymmetricKeys: Map<string, Buffer> = new Map();
  private userBalances: Map<string, bigint> = new Map();

  constructor(config: StellarConfig) {
    this.server = new rpc.Server(config.rpcUrl, {
      allowHttp: config.rpcUrl.startsWith("http://"),
    });
    this.serverKeypair = Keypair.fromSecret(config.sourceSecretKey);
    this.networkPassphrase = config.networkPassphrase;
    this.contractId = config.contractId;
  }

  /**
   * Parse deposit_requested event and get full deposit data from contract
   * Event structure: (requestId, packedData, encryptedIndex)
   * Note: packedData = encrypted_index in current implementation
   */
  async parseDepositEvent(
    event: ParsedEvent
  ): Promise<DepositEventData | null> {
    try {
      console.log("here: ", event);
      const eventData = StellarUtils.extractEventData(event);
      const eventType = eventData.topics[0];
      console.log({ eventType });
      console.log("before event");
      if (eventType !== "deposit_requested") {
        console.log("adentro");
        return null;
      }

      // Event structure: (requestId, packedData, encryptedIndex)
      const eventValue = eventData.data;

      // Extract data from event value
      // eventValue is an array: [requestId, packedData, encryptedIndex]
      const requestIdBytes = eventValue[0];
      const encryptedIndexBytes = eventValue[2];

      // Convert to hex strings for contract call
      const requestIdHex = EncryptionService.toHex(Buffer.from(requestIdBytes));

      // Now query the contract to get the full DepositRequest
      // We'll read the contract storage directly
      const depositRequest = await this.getDepositRequestFromContract(
        requestIdHex
      );

      if (!depositRequest) {
        console.error("Failed to get deposit request from contract");
        return null;
      }

      return {
        requestId: requestIdHex,
        user: depositRequest.user,
        amount: depositRequest.amount,
        timestamp: depositRequest.timestamp,
        ledger: depositRequest.ledger,
        encryptedIndex: Buffer.from(encryptedIndexBytes),
      };
    } catch (error) {
      console.error("Error parsing deposit event:", error);
      return null;
    }
  }

  /**
   * Get deposit request data from contract storage
   * This queries the DepositRequest stored in temporary storage using the contract's getter method
   */
  private async getDepositRequestFromContract(requestId: string): Promise<{
    user: string;
    amount: bigint;
    timestamp: bigint;
    ledger: number;
  } | null> {
    try {
      const contract = new Contract(this.contractId);
      const sourceAccount = await this.server.getAccount(
        this.serverKeypair.publicKey()
      );

      // Convert requestId to BytesN<32> for the contract call
      const requestIdBuffer = requestId.startsWith("0x")
        ? Buffer.from(requestId.slice(2), "hex")
        : Buffer.from(requestId, "hex");

      // Call get_deposit_request on the contract
      const operation = contract.call(
        "get_deposit_request",
        nativeToScVal(requestIdBuffer, { type: "bytes" })
      );

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      // Simulate the transaction to get the result
      const simulateResponse = await this.server.simulateTransaction(
        transaction
      );

      if (rpc.Api.isSimulationError(simulateResponse)) {
        throw new Error(
          `Simulation error: ${JSON.stringify(simulateResponse)}`
        );
      }

      const result = simulateResponse.result?.retval;
      if (!result) {
        console.error("No result from get_deposit_request");
        return null;
      }

      // Parse the DepositRequest struct from the result
      const depositRequest = scValToNative(result);

      // Extract fields from the struct
      // The struct has: { request_id, user, amount, timestamp, ledger, encrypted_index }
      // scValToNative already converts everything to native types
      const userAddress = depositRequest.user; // Already a string
      const amount = BigInt(depositRequest.amount);
      const timestamp = BigInt(depositRequest.timestamp);
      const ledger = Number(depositRequest.ledger);

      console.log(`   ✅ Retrieved deposit request from contract`);
      console.log(`      User: ${userAddress}`);
      console.log(`      Amount: ${amount.toString()}`);
      console.log(`      Timestamp: ${timestamp.toString()}`);
      console.log(`      Ledger: ${ledger}`);

      return {
        user: userAddress,
        amount,
        timestamp,
        ledger,
      };
    } catch (error) {
      console.error("Error getting deposit request from contract:", error);
      return null;
    }
  }

  /**
   * Handle deposit request event
   */
  async handleDepositRequest(event: ParsedEvent): Promise<void> {
    console.log("\n" + "=".repeat(70));
    console.log("💰 PROCESSING DEPOSIT REQUEST");
    console.log("=".repeat(70));

    const depositData = await this.parseDepositEvent(event);
    if (!depositData) {
      console.error("Failed to parse deposit event");
      return;
    }

    try {
      console.log(`   Request ID: ${depositData.requestId}`);
      console.log(`   User: ${depositData.user}`);
      console.log(`   Amount: ${depositData.amount.toString()}`);

      // Check if deposit is already completed
      console.log(`\n   🔍 Checking if deposit is already completed...`);
      const isCompleted = await this.isDepositCompleted(depositData.requestId);
      if (isCompleted) {
        console.log(`   ⏭️  Deposit already completed, skipping...`);
        console.log("=".repeat(70));
        return;
      }
      console.log(`   ✅ Deposit not yet completed, proceeding...`);

      // Get or create symmetric key for user
      let symmetricKey = this.userSymmetricKeys.get(depositData.user);
      let currentBalance = this.userBalances.get(depositData.user) || BigInt(0);

      if (!symmetricKey) {
        console.log("   🔑 Generating new symmetric key for user...");
        symmetricKey = EncryptionService.generateSymmetricKey();
        this.userSymmetricKeys.set(depositData.user, symmetricKey);
      } else {
        console.log("   🔑 Using existing symmetric key");
      }

      // Calculate new balance
      const newBalance = currentBalance + depositData.amount;
      this.userBalances.set(depositData.user, newBalance);

      console.log(`   💰 Old balance: ${currentBalance.toString()}`);
      console.log(`   💰 New balance: ${newBalance.toString()}`);

      // Encrypt new balance
      const encryptedAmount = EncryptionService.encryptWithSymmetricKey(
        newBalance.toString(),
        symmetricKey
      );

      console.log(`   🔒 Encrypted amount: ${encryptedAmount.length} bytes`);

      // Encrypt symmetric key for USER
      const encryptedKeyForUser =
        EncryptionService.encryptSymmetricKeyForAddress(
          symmetricKey,
          depositData.user
        );

      // Encrypt symmetric key for SERVER
      const encryptedKeyForServer =
        EncryptionService.encryptSymmetricKeyForAddress(
          symmetricKey,
          this.serverKeypair.publicKey()
        );

      console.log(
        `   🔐 Encrypted key for user: ${encryptedKeyForUser.length} bytes`
      );
      console.log(
        `   🔐 Encrypted key for server: ${encryptedKeyForServer.length} bytes`
      );

      // Get user index from contract
      console.log("\n   📋 Fetching user index from contract...");
      const userIndexEncrypted = await this.getUserIndex(depositData.user);

      if (!userIndexEncrypted || userIndexEncrypted.length === 0) {
        console.error(
          "   ❌ User index not found - user must authenticate first"
        );
        return;
      }

      // For testing: use encrypted index directly as user_index
      // In production, this would be properly encrypted with server's public key
      let userIndex: Buffer;
      try {
        // Try to decrypt user index
        userIndex = EncryptionService.decryptUserIndex(
          Buffer.from(userIndexEncrypted.slice(2), "hex"),
          this.serverKeypair.secret()
        );
        console.log(
          `   ✅ Decrypted user index: ${EncryptionService.toHex(userIndex)}`
        );
      } catch (error) {
        // If decryption fails, use the encrypted index directly (for testing with dummy data)
        console.log(
          `   ⚠️  Decryption failed, using encrypted index directly (testing mode)`
        );
        userIndex = Buffer.from(userIndexEncrypted.slice(2), "hex");
        console.log(
          `   📝 Using user index: ${EncryptionService.toHex(userIndex)}`
        );
      }

      // Store encrypted data on-chain
      console.log("\n   📝 Storing encrypted data on-chain...");
      await this.storeDeposit(
        depositData.requestId,
        depositData.user,
        depositData.amount,
        userIndex,
        encryptedAmount,
        encryptedKeyForUser,
        encryptedKeyForServer
      );

      console.log("   ✅ Deposit processed successfully!");
      console.log("=".repeat(70));
    } catch (error: any) {
      console.error("   ❌ Error processing deposit:", error.message);
      console.error("=".repeat(70));
    }
  }

  /**
   * Get user's encrypted index from contract
   */
  private async getUserIndex(userAddress: string): Promise<string> {
    const contract = new Contract(this.contractId);
    const sourceAccount = await this.server.getAccount(
      this.serverKeypair.publicKey()
    );

    const operation = contract.call(
      "get_user_index_by_address",
      Address.fromString(userAddress).toScVal()
    );

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simulateResponse = await this.server.simulateTransaction(transaction);

    if (rpc.Api.isSimulationError(simulateResponse)) {
      throw new Error(`Simulation error: ${JSON.stringify(simulateResponse)}`);
    }

    const result = simulateResponse.result?.retval;
    if (result) {
      const bytes = scValToNative(result);
      return EncryptionService.toHex(Buffer.from(bytes));
    }

    return "";
  }

  /**
   * Check if deposit is already completed
   */
  private async isDepositCompleted(requestId: string): Promise<boolean> {
    const contract = new Contract(this.contractId);
    const sourceAccount = await this.server.getAccount(
      this.serverKeypair.publicKey()
    );

    // Convert requestId from hex string to Buffer if it starts with 0x
    const requestIdBuffer = requestId.startsWith("0x")
      ? Buffer.from(requestId.slice(2), "hex")
      : Buffer.from(requestId, "hex");

    const operation = contract.call(
      "deposit_completed",
      nativeToScVal(requestIdBuffer, { type: "bytes" })
    );

    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simulateResponse = await this.server.simulateTransaction(transaction);

    if (rpc.Api.isSimulationError(simulateResponse)) {
      throw new Error(`Simulation error: ${JSON.stringify(simulateResponse)}`);
    }

    const result = simulateResponse.result?.retval;
    if (result) {
      return scValToNative(result) === true;
    }

    return false;
  }

  /**
   * Store encrypted deposit on-chain
   */
  private async storeDeposit(
    requestId: string,
    userAddress: string,
    amount: bigint,
    userIndex: Buffer,
    encryptedAmount: Buffer,
    encryptedKeyUser: Buffer,
    encryptedKeyServer: Buffer
  ): Promise<void> {
    const contract = new Contract(this.contractId);
    const sourceAccount = await this.server.getAccount(
      this.serverKeypair.publicKey()
    );

    // Convert requestId from hex string to Buffer if it starts with 0x
    const requestIdBuffer = requestId.startsWith("0x")
      ? Buffer.from(requestId.slice(2), "hex")
      : Buffer.from(requestId, "hex");

    // Convert to ScVals
    const args = [
      nativeToScVal(requestIdBuffer, { type: "bytes" }),
      Address.fromString(userAddress).toScVal(),
      nativeToScVal(amount, { type: "i128" }),
      nativeToScVal(userIndex, { type: "bytes" }),
      nativeToScVal(encryptedAmount, { type: "bytes" }),
      nativeToScVal(encryptedKeyUser, { type: "bytes" }),
      nativeToScVal(encryptedKeyServer, { type: "bytes" }),
    ];

    const operation = contract.call("store_deposit", ...args);

    let transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    // Simulate
    console.log("   🔍 Simulating transaction...");
    const simulateResponse = await this.server.simulateTransaction(transaction);

    if (rpc.Api.isSimulationError(simulateResponse)) {
      console.error("   ❌ Simulation error:", JSON.stringify(simulateResponse, null, 2));
      throw new Error(`Simulation error: ${JSON.stringify(simulateResponse)}`);
    }

    console.log("   ✅ Simulation successful");
    console.log("   📋 Auth entries needed:", simulateResponse.result?.auth?.length || 0);

    // Assemble transaction with auth from simulation
    // This is critical: assembleTransaction adds the authorization entries from simulation
    const assembledTx = rpc.assembleTransaction(transaction, simulateResponse).build();

    console.log("   📋 Transaction operations:", assembledTx.operations.length);

    // Sign with server keypair (this is the server_manager)
    assembledTx.sign(this.serverKeypair);

    console.log("   📝 Submitting transaction...");

    // Submit
    const sendResponse = await this.server.sendTransaction(assembledTx);

    if (sendResponse.status !== "PENDING") {
      console.error("   ❌ Transaction submission failed:", JSON.stringify(sendResponse, null, 2));
      throw new Error(
        `Transaction submission failed: ${JSON.stringify(sendResponse)}`
      );
    }

    console.log(`   📝 Transaction submitted: ${sendResponse.hash}`);

    // Wait for confirmation
    const result = await this.waitForTransaction(sendResponse.hash);

    if (result.status === "SUCCESS") {
      console.log("   ✅ Transaction confirmed!");
    } else {
      console.error("   ❌ Transaction failed:", JSON.stringify(result, null, 2));
      throw new Error(`Transaction failed: ${JSON.stringify(result)}`);
    }
  }

  /**
   * Wait for transaction confirmation
   */
  private async waitForTransaction(
    hash: string,
    maxAttempts: number = 30,
    delayMs: number = 2000
  ): Promise<rpc.Api.GetTransactionResponse> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await this.server.getTransaction(hash);

        if (response.status !== "NOT_FOUND") {
          return response;
        }

        console.log(
          `   ⏳ Waiting for confirmation... (${attempts + 1}/${maxAttempts})`
        );
      } catch (error) {
        console.error("   Error checking transaction status:", error);
      }

      await this.sleep(delayMs);
      attempts++;
    }

    throw new Error(
      `Transaction ${hash} not found after ${maxAttempts} attempts`
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
