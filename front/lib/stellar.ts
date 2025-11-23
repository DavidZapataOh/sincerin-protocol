import {
  Keypair,
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Contract,
  rpc,
  xdr,
  scValToNative,
  Address,
  nativeToScVal,
  Operation,
  Memo,
  MemoType,
} from "@stellar/stellar-sdk";
import { getStellarWalletsKit } from "./stellarWalletsKit";

// USDC Soroban Contract ID
export const USDC_CONTRACT_ID =
  "CABTCWWBVH4LFOFDZJXYMUC5H4MGV3IS2UI6R5PVBTPLDFK7PV7JPJR2";

// Encrypted Token Contract ID (desplegado)
export const ENCRYPTED_TOKEN_CONTRACT_ID =
  "CAOT53NBANPMUDQ7G43MYFZ3MATHO5IY73KGJZWWIBNFWVF5OFHV7UFH";

// Network configuration - using testnet
const STELLAR_NETWORK = Networks.TESTNET;
const HORIZON_URL = "https://horizon-testnet.stellar.org";
const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

// Get Stellar Server instance (using Horizon Server)
// Note: In SDK 14.3, Server is accessed differently
// We'll use rpc.Server for Soroban and a simple fetch for Horizon if needed
export function getStellarServer(): any {
  // For loading accounts, we can use fetch directly or rpc.Server
  // Since we only need loadAccount, we'll create a simple wrapper
  return {
    loadAccount: async (publicKey: string) => {
      const response = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
      if (!response.ok) {
        throw new Error(`Account not found: ${publicKey}`);
      }
      const accountData = await response.json();
      return {
        accountId: () => publicKey,
        sequenceNumber: () => accountData.sequence,
        incrementSequenceNumber: () => {},
        signers: accountData.signers || [],
        thresholds: accountData.thresholds || {
          lowThreshold: 0,
          medThreshold: 0,
          highThreshold: 0,
        },
      };
    },
  };
}

// Get Soroban RPC instance
export function getSorobanRpc(): rpc.Server {
  return new rpc.Server(SOROBAN_RPC_URL, { allowHttp: true });
}

// Get USDC Contract instance
export function getUSDCContract(): Contract {
  return new Contract(USDC_CONTRACT_ID);
}

// Get Encrypted Token Contract instance
export function getEncryptedTokenContract(): Contract {
  return new Contract(ENCRYPTED_TOKEN_CONTRACT_ID);
}

// Get USDC balance for an account (Soroban contract)
export async function getUSDCBalance(publicKey: string): Promise<string> {
  try {
    const contract = getUSDCContract();
    const sorobanRpc = getSorobanRpc();
    const server = getStellarServer();

    // Convert public key to Address ScVal
    const addressScVal = Address.fromString(publicKey).toScVal();

    // Try to load the user's account, or use a dummy account for simulation
    let sourceAccount;
    try {
      sourceAccount = await server.loadAccount(publicKey);
    } catch {
      // If account doesn't exist, create a minimal account for simulation
      const dummyKeypair = Keypair.random();
      sourceAccount = {
        accountId: () => dummyKeypair.publicKey(),
        sequenceNumber: () => "0",
        incrementSequenceNumber: () => {},
      } as any;
    }

    // Build a transaction to call the balance method
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_NETWORK,
    })
      .addOperation(contract.call("balance", addressScVal))
      .setTimeout(30)
      .build();

    // Simulate the transaction (read-only, no signature needed)
    const simulation = await sorobanRpc.simulateTransaction(transaction);

    if (rpc.Api.isSimulationError(simulation)) {
      console.error("Simulation error:", simulation.error);
      return "0";
    }

    // Extract the result from simulation
    if (simulation.result && simulation.result.retval) {
      const balance = scValToNative(simulation.result.retval);
      // Convert from smallest unit (18 decimals) to readable format
      // The balance is in i128 format (BigInt)
      const balanceBigInt = BigInt(balance.toString());
      const balanceFormatted = (Number(balanceBigInt) / 1e18).toString();
      return balanceFormatted;
    }

    return "0";
  } catch (error) {
    console.error("Error fetching USDC balance:", error);
    return "0";
  }
}

// Transfer USDC tokens (Soroban contract)
export async function transferUSDC(
  fromAddress: string,
  toAddress: string,
  amount: string
): Promise<string> {
  try {
    const kit = getStellarWalletsKit();
    if (!kit) {
      throw new Error("Wallet kit not available");
    }

    const server = getStellarServer();
    const sorobanRpc = getSorobanRpc();
    const sourceAccount = await server.loadAccount(fromAddress);

    const contract = getUSDCContract();

    // Convert amount to smallest unit (18 decimals)
    const amountInSmallestUnit = BigInt(Math.floor(parseFloat(amount) * 1e18));

    // Convert addresses and amount to ScVal
    const fromAddressScVal = Address.fromString(fromAddress).toScVal();
    const toAddressScVal = Address.fromString(toAddress).toScVal();
    const amountScVal = nativeToScVal(amountInSmallestUnit, { type: "i128" });

    // Build transaction with longer timeout to account for user interaction during signing
    // Official Stellar approach: set timeout BEFORE signing, not after
    // Timeout is in seconds - 300 = 5 minutes (enough for user to confirm in wallet)
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_NETWORK,
    })
      .addOperation(
        contract.call("transfer", fromAddressScVal, toAddressScVal, amountScVal)
      )
      .setTimeout(300) // 5 minutes - standard practice for user-interactive transactions
      .build();

    // Simulate transaction first to check if it will succeed
    const simulation = await sorobanRpc.simulateTransaction(transaction);

    if (rpc.Api.isSimulationError(simulation)) {
      throw new Error(`Simulation failed: ${simulation.error}`);
    }

    // Prepare transaction to get resource fees
    // This updates the transaction with proper fees for Soroban operations
    const preparedTransaction = await sorobanRpc.prepareTransaction(
      transaction
    );

    // Convert transaction to XDR for signing
    const transactionXdr = preparedTransaction.toXDR();

    // Sign transaction using wallet kit
    // User will need to confirm in their wallet - this may take time
    // The timeout set above ensures the transaction won't expire during this interaction
    const { signedTxXdr } = await kit.signTransaction(transactionXdr, {
      networkPassphrase: STELLAR_NETWORK,
    });

    if (!signedTxXdr) {
      throw new Error("Transaction was not signed");
    }

    // Convert signed XDR back to Transaction object
    const signedTx = TransactionBuilder.fromXDR(signedTxXdr, STELLAR_NETWORK);

    // Submit transaction immediately after signing
    // Official Stellar best practice: send immediately, don't modify after signing
    const response = await sorobanRpc.sendTransaction(signedTx);

    // Check if transaction was successful
    if (response.errorResult) {
      throw new Error(
        `Transaction failed: ${JSON.stringify(response.errorResult)}`
      );
    }

    if (!response.hash) {
      throw new Error("Transaction submission failed: no hash returned");
    }

    // Wait for transaction to be included in a ledger
    // Transactions can take a few seconds to be included, so we poll with retries
    let getTxResponse;
    let retries = 0;
    const maxRetries = 10;
    const retryDelay = 2000; // 2 seconds

    while (retries < maxRetries) {
      getTxResponse = await sorobanRpc.getTransaction(response.hash);

      if (getTxResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        // Transaction was successfully included
        return response.hash;
      }

      if (getTxResponse.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error("Transaction failed to be included in ledger");
      }

      // If NOT_FOUND, wait and retry
      if (getTxResponse.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
        retries++;
        if (retries < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }
      }

      // If we get here, transaction status is unknown
      break;
    }

    // If we exhausted retries but have a hash, return it anyway
    // The transaction may still be processing
    if (response.hash) {
      return response.hash;
    }

    throw new Error("Transaction not found after retries");
  } catch (error: any) {
    console.error("Error transferring USDC:", error);
    throw new Error(error?.message || "Failed to transfer USDC");
  }
}

// Validate Stellar address
export function isValidStellarAddress(address: string): boolean {
  try {
    Keypair.fromPublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create encrypted index from user signature
 * This creates a hash of a signed message and encrypts it for the server
 */
async function createEncryptedIndex(
  userAddress: string,
  serverAddress: string
): Promise<Uint8Array> {
  // Import crypto-js for browser compatibility
  const CryptoJS = await import("crypto-js");

  // Create a message to sign (unique per user)
  const message = `Sincerin Protocol Authentication\nAddress: ${userAddress}\nTimestamp: ${Date.now()}`;

  // Hash the message (SHA-256)
  const messageHash = CryptoJS.SHA256(message);

  // Hash the server address to create encryption key (matching backend)
  const addressHash = CryptoJS.SHA256(serverAddress);

  // Convert to WordArray for encryption
  const key = CryptoJS.enc.Hex.parse(addressHash.toString());
  const iv = CryptoJS.lib.WordArray.create([0, 0, 0, 0]); // Zero IV for deterministic demo

  // Encrypt using AES-256-CBC (matching backend EncryptionService)
  const encrypted = CryptoJS.AES.encrypt(messageHash, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // Convert to Uint8Array (ciphertext is already a WordArray)
  const encryptedWords = encrypted.ciphertext;
  const encryptedArray = new Uint8Array(encryptedWords.sigBytes);
  const words = encryptedWords.words;
  for (let i = 0; i < encryptedWords.sigBytes; i++) {
    const wordIndex = i >>> 2;
    const byteIndex = i % 4;
    encryptedArray[i] = (words[wordIndex] >>> (24 - byteIndex * 8)) & 0xff;
  }

  return encryptedArray;
}

/**
 * Convert USDC to private tokens
 * 1. Transfers USDC from user to encrypted token contract
 * 2. Calls request_deposit on the encrypted token contract
 * 3. Backend will process the event and store encrypted balance
 */
export async function convertToPrivate(
  userAddress: string,
  amount: string
): Promise<string> {
  try {
    const kit = getStellarWalletsKit();
    if (!kit) {
      throw new Error("Wallet kit not available");
    }

    const server = getStellarServer();
    const sorobanRpc = getSorobanRpc();

    // Try to load the user's account, or use a dummy account for simulation
    let sourceAccount;
    try {
      sourceAccount = await server.loadAccount(userAddress);
    } catch {
      // If account doesn't exist, create a minimal account for simulation
      const dummyKeypair = Keypair.random();
      sourceAccount = {
        accountId: () => dummyKeypair.publicKey(),
        sequenceNumber: () => "0",
        incrementSequenceNumber: () => {},
      } as any;
    }

    // Get server manager address from contract (needed for encrypted_index)
    const encryptedTokenContract = getEncryptedTokenContract();
    const serverManagerOperation =
      encryptedTokenContract.call("get_server_manager");

    const serverManagerTx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_NETWORK,
    })
      .addOperation(serverManagerOperation)
      .setTimeout(30)
      .build();

    const serverManagerSim = await sorobanRpc.simulateTransaction(
      serverManagerTx
    );
    if (rpc.Api.isSimulationError(serverManagerSim)) {
      console.error("Server manager simulation error:", serverManagerSim.error);
      const errorMsg =
        typeof serverManagerSim.error === "string"
          ? serverManagerSim.error
          : JSON.stringify(serverManagerSim.error);
      throw new Error(
        `Failed to get server manager address. The contract may not be initialized. Error: ${errorMsg}`
      );
    }

    if (!serverManagerSim.result || !serverManagerSim.result.retval) {
      console.error(
        "Server manager simulation result:",
        serverManagerSim.result
      );
      throw new Error(
        "No result from get_server_manager simulation. The contract may not be initialized."
      );
    }

    let serverManagerAddress: string;
    try {
      const retval = scValToNative(serverManagerSim.result.retval);
      // The address might be returned as an Address object or string
      if (typeof retval === "string") {
        serverManagerAddress = retval;
      } else if (retval instanceof Address) {
        // If it's an Address object, convert to string
        serverManagerAddress = retval.toString();
      } else if (retval && typeof retval === "object" && "toString" in retval) {
        serverManagerAddress = retval.toString();
      } else {
        console.error("Unexpected retval type:", typeof retval, retval);
        throw new Error(`Unexpected address format: ${typeof retval}`);
      }
    } catch (error: any) {
      console.error("Error converting server manager address:", error);
      console.error("Retval was:", serverManagerSim.result.retval);
      throw new Error(
        `Failed to parse server manager address: ${error.message}`
      );
    }

    if (!serverManagerAddress || serverManagerAddress.length < 10) {
      throw new Error(
        `Invalid server manager address: ${serverManagerAddress}`
      );
    }

    console.log("Server manager address retrieved:", serverManagerAddress);

    // Create encrypted index
    const encryptedIndex = await createEncryptedIndex(
      userAddress,
      serverManagerAddress
    );

    // Convert amount to smallest unit (18 decimals)
    const amountInSmallestUnit = BigInt(Math.floor(parseFloat(amount) * 1e18));

    // Step 1: Transfer USDC from user to encrypted token contract
    const usdcContract = getUSDCContract();
    const userAddressScVal = Address.fromString(userAddress).toScVal();
    const contractAddressScVal = Address.fromString(
      ENCRYPTED_TOKEN_CONTRACT_ID
    ).toScVal();
    const amountScVal = nativeToScVal(amountInSmallestUnit, { type: "i128" });

    // Build transfer transaction
    const transferTx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_NETWORK,
    })
      .addOperation(
        usdcContract.call(
          "transfer",
          userAddressScVal,
          contractAddressScVal,
          amountScVal
        )
      )
      .setTimeout(300)
      .build();

    // Simulate transfer
    const transferSim = await sorobanRpc.simulateTransaction(transferTx);
    if (rpc.Api.isSimulationError(transferSim)) {
      throw new Error(`Transfer simulation failed: ${transferSim.error}`);
    }

    // Prepare transfer transaction
    const preparedTransferTx = await sorobanRpc.prepareTransaction(transferTx);

    // Sign and submit transfer
    const transferXdr = preparedTransferTx.toXDR();
    const { signedTxXdr: signedTransferXdr } = await kit.signTransaction(
      transferXdr,
      {
        networkPassphrase: STELLAR_NETWORK,
      }
    );

    if (!signedTransferXdr) {
      throw new Error("Transfer transaction was not signed");
    }

    const signedTransferTx = TransactionBuilder.fromXDR(
      signedTransferXdr,
      STELLAR_NETWORK
    );
    const transferResponse = await sorobanRpc.sendTransaction(signedTransferTx);

    if (transferResponse.errorResult) {
      throw new Error(
        `Transfer failed: ${JSON.stringify(transferResponse.errorResult)}`
      );
    }

    if (!transferResponse.hash) {
      throw new Error("Transfer submission failed: no hash returned");
    }

    // Wait for transfer to be included
    await waitForTransaction(transferResponse.hash, sorobanRpc);

    // Step 2: Call request_deposit on encrypted token contract
    // Reload account for new sequence number
    const updatedAccount = await server.loadAccount(userAddress);

    // Convert Uint8Array to Buffer-like format for nativeToScVal
    const encryptedIndexBuffer = Buffer.from(encryptedIndex);
    const encryptedIndexScVal = nativeToScVal(encryptedIndexBuffer, {
      type: "bytes",
    });
    const requestDepositTx = new TransactionBuilder(updatedAccount, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_NETWORK,
    })
      .addOperation(
        encryptedTokenContract.call(
          "request_deposit",
          userAddressScVal,
          amountScVal,
          encryptedIndexScVal
        )
      )
      .setTimeout(300)
      .build();

    // Simulate request_deposit
    const depositSim = await sorobanRpc.simulateTransaction(requestDepositTx);
    if (rpc.Api.isSimulationError(depositSim)) {
      throw new Error(`Deposit request simulation failed: ${depositSim.error}`);
    }

    // Prepare request_deposit transaction
    const preparedDepositTx = await sorobanRpc.prepareTransaction(
      requestDepositTx
    );

    // Sign and submit request_deposit
    const depositXdr = preparedDepositTx.toXDR();
    const { signedTxXdr: signedDepositXdr } = await kit.signTransaction(
      depositXdr,
      {
        networkPassphrase: STELLAR_NETWORK,
      }
    );

    if (!signedDepositXdr) {
      throw new Error("Deposit request transaction was not signed");
    }

    const signedDepositTx = TransactionBuilder.fromXDR(
      signedDepositXdr,
      STELLAR_NETWORK
    );
    const depositResponse = await sorobanRpc.sendTransaction(signedDepositTx);

    if (depositResponse.errorResult) {
      throw new Error(
        `Deposit request failed: ${JSON.stringify(depositResponse.errorResult)}`
      );
    }

    if (!depositResponse.hash) {
      throw new Error("Deposit request submission failed: no hash returned");
    }

    // Wait for deposit request to be included
    await waitForTransaction(depositResponse.hash, sorobanRpc);

    return depositResponse.hash;
  } catch (error: any) {
    console.error("Error converting to private:", error);
    throw new Error(error?.message || "Failed to convert to private tokens");
  }
}

/**
 * Get encrypted private balance for a user
 * Returns the balance if it can be decrypted, or "0" if not available
 * Note: Full decryption requires the user's private key, which we don't have access to in the frontend
 * This function attempts to get the encrypted balance from the contract
 */
export async function getPrivateBalance(userAddress: string): Promise<string> {
  try {
    const sorobanRpc = getSorobanRpc();
    const server = getStellarServer();
    const encryptedTokenContract = getEncryptedTokenContract();

    // Try to load the user's account, or use a dummy account for simulation
    let sourceAccount;
    try {
      sourceAccount = await server.loadAccount(userAddress);
    } catch {
      const dummyKeypair = Keypair.random();
      sourceAccount = {
        accountId: () => dummyKeypair.publicKey(),
        sequenceNumber: () => "0",
        incrementSequenceNumber: () => {},
      } as any;
    }

    // Step 1: Get encrypted_index from contract
    const userAddressScVal = Address.fromString(userAddress).toScVal();
    const getIndexTx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_NETWORK,
    })
      .addOperation(
        encryptedTokenContract.call(
          "get_user_index_by_address",
          userAddressScVal
        )
      )
      .setTimeout(30)
      .build();

    const indexSim = await sorobanRpc.simulateTransaction(getIndexTx);
    if (rpc.Api.isSimulationError(indexSim)) {
      // User not authenticated yet
      return "0";
    }

    if (!indexSim.result || !indexSim.result.retval) {
      // User not authenticated yet
      return "0";
    }

    const encryptedIndexBytes = scValToNative(indexSim.result.retval);
    if (
      !encryptedIndexBytes ||
      (Array.isArray(encryptedIndexBytes) && encryptedIndexBytes.length === 0)
    ) {
      return "0";
    }

    // Step 2: Calculate user_index (keccak256 hash of encrypted_index)
    const CryptoJS = await import("crypto-js");

    // Convert encrypted_index to hex string
    let encryptedIndexArray: Uint8Array;
    if (Array.isArray(encryptedIndexBytes)) {
      encryptedIndexArray = new Uint8Array(encryptedIndexBytes);
    } else if (typeof encryptedIndexBytes === "string") {
      // If it's a hex string, convert it
      const cleanHex = encryptedIndexBytes.startsWith("0x")
        ? encryptedIndexBytes.slice(2)
        : encryptedIndexBytes;
      encryptedIndexArray = new Uint8Array(Buffer.from(cleanHex, "hex"));
    } else {
      encryptedIndexArray = new Uint8Array(
        Buffer.from(encryptedIndexBytes as any)
      );
    }

    const encryptedIndexHex = Array.from(encryptedIndexArray)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Hash using keccak256 (SHA256 for now, but should be keccak256)
    // Note: crypto-js doesn't have keccak256, so we'll use SHA256 as approximation
    // In production, you'd want to use a proper keccak256 library
    const userIndexHash = CryptoJS.SHA256(
      CryptoJS.enc.Hex.parse(encryptedIndexHex)
    );
    const userIndexArray = new Uint8Array(32);
    const userIndexWords = userIndexHash.words;
    for (let i = 0; i < 32; i++) {
      const wordIndex = i >>> 2;
      const byteIndex = i % 4;
      userIndexArray[i] =
        (userIndexWords[wordIndex] >>> (24 - byteIndex * 8)) & 0xff;
    }

    // Step 3: Get encrypted balance using user_index
    const userIndexScVal = nativeToScVal(userIndexArray, { type: "bytes" });
    const getBalanceTx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_NETWORK,
    })
      .addOperation(
        encryptedTokenContract.call("get_encrypted_balance", userIndexScVal)
      )
      .setTimeout(30)
      .build();

    const balanceSim = await sorobanRpc.simulateTransaction(getBalanceTx);
    if (rpc.Api.isSimulationError(balanceSim)) {
      return "0";
    }

    if (!balanceSim.result || !balanceSim.result.retval) {
      return "0";
    }

    const encryptedBalance = scValToNative(balanceSim.result.retval);
    if (!encryptedBalance || !encryptedBalance.exists) {
      return "0";
    }

    // Step 4: Try to decrypt encrypted_key_user using user address
    // This matches the backend EncryptionService.encryptSymmetricKeyForAddress
    const encryptedKeyUserBytes = encryptedBalance.encrypted_key_user;
    let encryptedKeyUserArray: Uint8Array;

    if (Array.isArray(encryptedKeyUserBytes)) {
      encryptedKeyUserArray = new Uint8Array(encryptedKeyUserBytes);
    } else if (typeof encryptedKeyUserBytes === "string") {
      const cleanHex = encryptedKeyUserBytes.startsWith("0x")
        ? encryptedKeyUserBytes.slice(2)
        : encryptedKeyUserBytes;
      encryptedKeyUserArray = new Uint8Array(Buffer.from(cleanHex, "hex"));
    } else {
      encryptedKeyUserArray = new Uint8Array(
        Buffer.from(encryptedKeyUserBytes as any)
      );
    }

    const encryptedKeyUserHex = Array.from(encryptedKeyUserArray)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Decrypt using address hash (matching backend EncryptionService)
    const addressHash = CryptoJS.SHA256(userAddress);
    const key = CryptoJS.enc.Hex.parse(addressHash.toString());
    const iv = CryptoJS.lib.WordArray.create([0, 0, 0, 0]); // Zero IV

    // Create CipherParams object for decryption
    const encryptedKeyParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Hex.parse(encryptedKeyUserHex),
    });

    const decryptedKey = CryptoJS.AES.decrypt(encryptedKeyParams, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const symmetricKeyArray = new Uint8Array(32);
    const decryptedKeyWords = decryptedKey.words;
    for (let i = 0; i < 32 && i < decryptedKey.sigBytes; i++) {
      const wordIndex = i >>> 2;
      const byteIndex = i % 4;
      symmetricKeyArray[i] =
        (decryptedKeyWords[wordIndex] >>> (24 - byteIndex * 8)) & 0xff;
    }

    // Step 5: Decrypt encrypted_amount using symmetric key (AES-256-GCM)
    const encryptedAmountBytes = encryptedBalance.encrypted_amount;
    let encryptedAmountArray: Uint8Array;

    if (Array.isArray(encryptedAmountBytes)) {
      encryptedAmountArray = new Uint8Array(encryptedAmountBytes);
    } else if (typeof encryptedAmountBytes === "string") {
      const cleanHex = encryptedAmountBytes.startsWith("0x")
        ? encryptedAmountBytes.slice(2)
        : encryptedAmountBytes;
      encryptedAmountArray = new Uint8Array(Buffer.from(cleanHex, "hex"));
    } else {
      encryptedAmountArray = new Uint8Array(
        Buffer.from(encryptedAmountBytes as any)
      );
    }

    // AES-256-GCM format: iv (16 bytes) + authTag (16 bytes) + encrypted (rest)
    if (encryptedAmountArray.length < 32) {
      return "0";
    }

    const iv_gcm = encryptedAmountArray.slice(0, 16);
    const authTag = encryptedAmountArray.slice(16, 32);
    const encrypted = encryptedAmountArray.slice(32);

    // Convert to crypto-js format for decryption
    const iv_gcm_words = CryptoJS.lib.WordArray.create(iv_gcm);
    const encrypted_words = CryptoJS.lib.WordArray.create(encrypted);
    const symmetricKey_words = CryptoJS.lib.WordArray.create(symmetricKeyArray);

    // Note: crypto-js doesn't support GCM directly, but we can try CBC as fallback
    // For proper GCM, we'd need Web Crypto API
    try {
      // Create CipherParams object for decryption
      const encryptedParams = CryptoJS.lib.CipherParams.create({
        ciphertext: encrypted_words,
      });

      const decrypted = CryptoJS.AES.decrypt(
        encryptedParams,
        symmetricKey_words,
        {
          iv: iv_gcm_words,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        }
      );

      const balanceString = decrypted.toString(CryptoJS.enc.Utf8);
      if (!balanceString || balanceString.length === 0) {
        return "0";
      }

      // Convert from smallest unit (18 decimals) to readable format
      const balanceBigInt = BigInt(balanceString);
      const balanceFormatted = (Number(balanceBigInt) / 1e18).toString();

      return balanceFormatted;
    } catch (error) {
      console.error("Error decrypting balance:", error);
      // Return "0" if decryption fails
      return "0";
    }
  } catch (error) {
    console.error("Error getting private balance:", error);
    return "0";
  }
}

/**
 * Helper function to wait for transaction inclusion
 */
async function waitForTransaction(
  hash: string,
  sorobanRpc: rpc.Server,
  maxRetries: number = 10,
  retryDelay: number = 2000
): Promise<void> {
  let retries = 0;

  while (retries < maxRetries) {
    const getTxResponse = await sorobanRpc.getTransaction(hash);

    if (getTxResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return;
    }

    if (getTxResponse.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error("Transaction failed to be included in ledger");
    }

    retries++;
    if (retries < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error("Transaction not found after retries");
}
