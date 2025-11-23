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

interface TransferEventData {
  transferId: string;
  sender: string;
  encryptedReceiverIndex: Buffer;
  encryptedAmount: Buffer;
  timestamp: bigint;
  ledger: number;
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

      // Get user index from contract first to fetch existing balance
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

      // Fetch existing encrypted balance from blockchain
      console.log("\n   📥 Fetching existing balance from blockchain...");
      const existingBalance = await this.getEncryptedBalanceFromContract(userIndex);

      let symmetricKey: Buffer;
      let currentBalance = BigInt(0);

      if (existingBalance && existingBalance.exists) {
        console.log("   ✅ Found existing encrypted balance on-chain");

        // Decrypt the symmetric key from the existing balance
        const encryptedKeyForServer = Buffer.from(existingBalance.encrypted_key_server);
        symmetricKey = EncryptionService.decryptSymmetricKeyForAddress(
          encryptedKeyForServer,
          this.serverKeypair.secret()
        );

        // Decrypt the current balance
        const encryptedAmount = Buffer.from(existingBalance.encrypted_amount);
        const decryptedBalance = EncryptionService.decryptWithSymmetricKey(
          encryptedAmount,
          symmetricKey
        );
        currentBalance = BigInt(decryptedBalance);

        console.log(`   💰 Current balance on-chain: ${currentBalance.toString()}`);
      } else {
        console.log("   🆕 No existing balance found, creating new");
        symmetricKey = EncryptionService.generateSymmetricKey();
        console.log("   🔑 Generated new symmetric key for user");
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
   * Get encrypted balance from contract
   */
  private async getEncryptedBalanceFromContract(userIndex: Buffer): Promise<{
    encrypted_amount: Uint8Array;
    encrypted_key_user: Uint8Array;
    encrypted_key_server: Uint8Array;
    timestamp: number;
    exists: boolean;
  } | null> {
    try {
      const contract = new Contract(this.contractId);
      const sourceAccount = await this.server.getAccount(
        this.serverKeypair.publicKey()
      );

      const operation = contract.call(
        "get_encrypted_balance",
        nativeToScVal(userIndex, { type: "bytes" })
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
      if (!result) {
        return null;
      }

      const encryptedBalance = scValToNative(result);
      return encryptedBalance;
    } catch (error) {
      console.error("Error getting encrypted balance from contract:", error);
      return null;
    }
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

    // Use prepareTransaction which handles authorization signing automatically
    // This is critical: prepareTransaction will add proper authorization signatures
    const assembledTx = await this.server.prepareTransaction(transaction);

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

  /**
   * Parse transfer_requested event
   * Event structure: (transferId, sender, encryptedReceiverIndex, encryptedAmount)
   */
  async parseTransferEvent(
    event: ParsedEvent
  ): Promise<TransferEventData | null> {
    try {
      const eventData = StellarUtils.extractEventData(event);
      const eventType = eventData.topics[0];

      if (eventType !== "transfer_requested") {
        console.error("Invalid event type:", eventType);
        return null;
      }

      // Parse event data
      // Event structure from contract: (transfer_id, sender, encrypted_receiver_index, encrypted_amount)
      // All data is in the value array
      const eventValue = eventData.data;

      // Extract from value array
      const transferId = Buffer.from(eventValue[0] as Uint8Array).toString("hex");
      const sender = eventValue[1] as string;
      const encryptedReceiverIndex = Buffer.from(eventValue[2] as Uint8Array);
      const encryptedAmount = Buffer.from(eventValue[3] as Uint8Array);

      console.log("\n📦 Transfer Event Parsed:");
      console.log(`   Transfer ID: 0x${transferId}`);
      console.log(`   Sender: ${sender}`);
      console.log(`   Encrypted Receiver Index: ${encryptedReceiverIndex.toString("hex").substring(0, 32)}...`);
      console.log(`   Encrypted Amount: ${encryptedAmount.toString("hex").substring(0, 32)}...`);

      return {
        transferId: `0x${transferId}`,
        sender,
        encryptedReceiverIndex,
        encryptedAmount,
        timestamp: BigInt(0), // Will be filled from transaction
        ledger: 0,
      };
    } catch (error) {
      console.error("Error parsing transfer event:", error);
      return null;
    }
  }

  /**
   * Check if transfer is already completed
   */
  private async isTransferCompleted(transferId: string): Promise<boolean> {
    try {
      const contract = new Contract(this.contractId);
      const sourceAccount = await this.server.getAccount(
        this.serverKeypair.publicKey()
      );

      // Convert transferId to BytesN<32>
      const transferIdBuffer = transferId.startsWith("0x")
        ? Buffer.from(transferId.slice(2), "hex")
        : Buffer.from(transferId, "hex");

      const operation = contract.call(
        "transfer_completed",
        nativeToScVal(transferIdBuffer, { type: "bytes" })
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
        return false;
      }

      const result = simulateResponse.result?.retval;
      if (!result) {
        return false;
      }

      return scValToNative(result) === true;
    } catch (error) {
      console.error("Error checking if transfer is completed:", error);
      return false;
    }
  }

  /**
   * Handle transfer request
   * 1. Decrypt receiver index and amount
   * 2. Get current balances for sender and receiver
   * 3. Validate sender has sufficient balance
   * 4. Calculate new balances
   * 5. Re-encrypt both balances
   * 6. Call process_transfer on contract
   */
  async handleTransferRequest(event: ParsedEvent): Promise<void> {
    console.log("\n" + "=".repeat(70));
    console.log("🔄 PROCESSING TRANSFER REQUEST");
    console.log("=".repeat(70));

    const transferData = await this.parseTransferEvent(event);
    if (!transferData) {
      console.error("❌ Failed to parse transfer event");
      return;
    }

    // Check if already completed
    const isCompleted = await this.isTransferCompleted(transferData.transferId);
    if (isCompleted) {
      console.log("⚠️  Transfer already completed, skipping");
      return;
    }

    console.log("\n🔓 Step 1: Decrypting transfer data...");

    // Decrypt receiver index
    const receiverIndex = EncryptionService.decryptSymmetricKeyForAddress(
      transferData.encryptedReceiverIndex,
      this.serverKeypair.secret()
    );
    console.log(`   ✅ Decrypted receiver index: ${receiverIndex.toString("hex").substring(0, 32)}...`);

    // Decrypt amount
    const amountBytes = EncryptionService.decryptSymmetricKeyForAddress(
      transferData.encryptedAmount,
      this.serverKeypair.secret()
    );
    const transferAmount = BigInt(amountBytes.toString("utf8"));
    console.log(`   ✅ Decrypted transfer amount: ${transferAmount.toString()} stroops`);

    // Get sender's user index
    console.log("\n📥 Step 2: Getting sender's user index...");
    const senderIndexHex = await this.getUserIndex(transferData.sender);
    if (!senderIndexHex) {
      console.error("❌ Sender not authenticated");
      return;
    }
    const senderIndex = Buffer.from(senderIndexHex.replace("0x", ""), "hex");
    console.log(`   ✅ Sender index: ${senderIndexHex}`);

    // Get current balances
    console.log("\n💰 Step 3: Fetching current balances from blockchain...");

    const senderBalance = await this.getEncryptedBalanceFromContract(senderIndex);
    if (!senderBalance || !senderBalance.exists) {
      console.error("❌ Sender has no balance");
      return;
    }

    // Decrypt sender's current balance
    const senderSymmetricKey = EncryptionService.decryptSymmetricKeyForAddress(
      Buffer.from(senderBalance.encrypted_key_server),
      this.serverKeypair.secret()
    );
    const senderCurrentBalance = BigInt(
      EncryptionService.decryptWithSymmetricKey(
        Buffer.from(senderBalance.encrypted_amount),
        senderSymmetricKey
      )
    );
    console.log(`   📊 Sender current balance: ${senderCurrentBalance.toString()} stroops`);

    // Validate sender has sufficient balance
    if (senderCurrentBalance < transferAmount) {
      console.error(`❌ Insufficient balance. Has ${senderCurrentBalance}, needs ${transferAmount}`);
      return;
    }

    // Get receiver's balance
    const receiverBalance = await this.getEncryptedBalanceFromContract(receiverIndex);

    let receiverSymmetricKey: Buffer;
    let receiverCurrentBalance = BigInt(0);

    if (receiverBalance && receiverBalance.exists) {
      receiverSymmetricKey = EncryptionService.decryptSymmetricKeyForAddress(
        Buffer.from(receiverBalance.encrypted_key_server),
        this.serverKeypair.secret()
      );
      receiverCurrentBalance = BigInt(
        EncryptionService.decryptWithSymmetricKey(
          Buffer.from(receiverBalance.encrypted_amount),
          receiverSymmetricKey
        )
      );
      console.log(`   📊 Receiver current balance: ${receiverCurrentBalance.toString()} stroops`);
    } else {
      console.log("   🆕 Receiver has no existing balance, creating new");
      receiverSymmetricKey = EncryptionService.generateSymmetricKey();
    }

    // Calculate new balances
    console.log("\n🧮 Step 4: Calculating new balances...");
    const senderNewBalance = senderCurrentBalance - transferAmount;
    const receiverNewBalance = receiverCurrentBalance + transferAmount;

    console.log(`   💸 Sender new balance: ${senderNewBalance.toString()} stroops`);
    console.log(`   💰 Receiver new balance: ${receiverNewBalance.toString()} stroops`);

    // Encrypt new balances
    console.log("\n🔐 Step 5: Encrypting new balances...");

    // For sender - reuse existing symmetric key
    const senderEncryptedAmount = EncryptionService.encryptWithSymmetricKey(
      senderNewBalance.toString(),
      senderSymmetricKey
    );
    const senderEncryptedKeyUser = EncryptionService.encryptSymmetricKeyForAddress(
      senderSymmetricKey,
      transferData.sender
    );
    const senderEncryptedKeyServer = EncryptionService.encryptSymmetricKeyForAddress(
      senderSymmetricKey,
      this.serverKeypair.publicKey()
    );

    console.log("   ✅ Sender balance encrypted");

    // For receiver - get receiver address first
    // We need to find receiver's address from their user index
    // This is a limitation - in production, you'd store user_index -> address mapping
    // For now, we'll use the receiver's symmetric key encryption

    const receiverEncryptedAmount = EncryptionService.encryptWithSymmetricKey(
      receiverNewBalance.toString(),
      receiverSymmetricKey
    );
    // Note: We can't encrypt for receiver's address without knowing it
    // So we'll use server's address as placeholder for receiver's user key
    const receiverEncryptedKeyUser = EncryptionService.encryptSymmetricKeyForAddress(
      receiverSymmetricKey,
      this.serverKeypair.publicKey() // Placeholder - ideally receiver's address
    );
    const receiverEncryptedKeyServer = EncryptionService.encryptSymmetricKeyForAddress(
      receiverSymmetricKey,
      this.serverKeypair.publicKey()
    );

    console.log("   ✅ Receiver balance encrypted");

    // Call process_transfer on contract
    console.log("\n📤 Step 6: Calling process_transfer on contract...");

    const contract = new Contract(this.contractId);
    const sourceAccount = await this.server.getAccount(
      this.serverKeypair.publicKey()
    );

    // Convert transfer ID to BytesN<32>
    const transferIdBuffer = Buffer.from(transferData.transferId.replace("0x", ""), "hex");

    const operation = contract.call(
      "process_transfer",
      nativeToScVal(transferIdBuffer, { type: "bytes" }),
      nativeToScVal(senderIndex, { type: "bytes" }),
      nativeToScVal(receiverIndex, { type: "bytes" }),
      nativeToScVal(senderEncryptedAmount, { type: "bytes" }),
      nativeToScVal(senderEncryptedKeyUser, { type: "bytes" }),
      nativeToScVal(senderEncryptedKeyServer, { type: "bytes" }),
      nativeToScVal(receiverEncryptedAmount, { type: "bytes" }),
      nativeToScVal(receiverEncryptedKeyUser, { type: "bytes" }),
      nativeToScVal(receiverEncryptedKeyServer, { type: "bytes" })
    );

    const transaction = new TransactionBuilder(sourceAccount, {
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

    // Assemble transaction with auth from simulation
    const assembledTx = rpc.assembleTransaction(transaction, simulateResponse).build();

    // Sign with server keypair
    assembledTx.sign(this.serverKeypair);

    console.log("   📝 Submitting transaction...");

    // Submit
    const sendResponse = await this.server.sendTransaction(assembledTx);

    if (sendResponse.status !== "PENDING") {
      console.error("   ❌ Transaction submission failed:", JSON.stringify(sendResponse, null, 2));
      throw new Error(`Transaction submission failed: ${JSON.stringify(sendResponse)}`);
    }

    console.log(`   📝 Transaction submitted: ${sendResponse.hash}`);

    // Wait for confirmation
    const result = await this.waitForTransaction(sendResponse.hash);

    if (result.status === "SUCCESS") {
      console.log("   ✅ Transaction confirmed!");
      console.log("\n🎉 TRANSFER COMPLETED SUCCESSFULLY!");
      console.log("─".repeat(70));
      console.log(`   Transfer ID: ${transferData.transferId}`);
      console.log(`   Amount: ${transferAmount.toString()} stroops`);
      console.log(`   Sender new balance: ${senderNewBalance.toString()} stroops`);
      console.log(`   Receiver new balance: ${receiverNewBalance.toString()} stroops`);
      console.log("─".repeat(70));
    } else {
      console.error("   ❌ Transaction failed:", JSON.stringify(result, null, 2));
      throw new Error(`Transaction failed: ${JSON.stringify(result)}`);
    }
  }
}
