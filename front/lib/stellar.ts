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
  MemoType
} from "@stellar/stellar-sdk"
import { getStellarWalletsKit } from "./stellarWalletsKit"

// USDC Soroban Contract ID
export const USDC_CONTRACT_ID = "CABTCWWBVH4LFOFDZJXYMUC5H4MGV3IS2UI6R5PVBTPLDFK7PV7JPJR2"

// Network configuration - using testnet
const STELLAR_NETWORK = Networks.TESTNET
const HORIZON_URL = "https://horizon-testnet.stellar.org"
const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org"

// Get Stellar Server instance (using Horizon Server)
// Note: In SDK 14.3, Server is accessed differently
// We'll use rpc.Server for Soroban and a simple fetch for Horizon if needed
export function getStellarServer(): any {
  // For loading accounts, we can use fetch directly or rpc.Server
  // Since we only need loadAccount, we'll create a simple wrapper
  return {
    loadAccount: async (publicKey: string) => {
      const response = await fetch(`${HORIZON_URL}/accounts/${publicKey}`)
      if (!response.ok) {
        throw new Error(`Account not found: ${publicKey}`)
      }
      const accountData = await response.json()
      return {
        accountId: () => publicKey,
        sequenceNumber: () => accountData.sequence,
        incrementSequenceNumber: () => {},
        signers: accountData.signers || [],
        thresholds: accountData.thresholds || { lowThreshold: 0, medThreshold: 0, highThreshold: 0 },
      }
    }
  }
}

// Get Soroban RPC instance
export function getSorobanRpc(): rpc.Server {
  return new rpc.Server(SOROBAN_RPC_URL, { allowHttp: true })
}

// Get USDC Contract instance
export function getUSDCContract(): Contract {
  return new Contract(USDC_CONTRACT_ID)
}

// Get USDC balance for an account (Soroban contract)
export async function getUSDCBalance(publicKey: string): Promise<string> {
  try {
    const contract = getUSDCContract()
    const sorobanRpc = getSorobanRpc()
    const server = getStellarServer()
    
    // Convert public key to Address ScVal
    const addressScVal = Address.fromString(publicKey).toScVal()
    
    // Try to load the user's account, or use a dummy account for simulation
    let sourceAccount
    try {
      sourceAccount = await server.loadAccount(publicKey)
    } catch {
      // If account doesn't exist, create a minimal account for simulation
      const dummyKeypair = Keypair.random()
      sourceAccount = {
        accountId: () => dummyKeypair.publicKey(),
        sequenceNumber: () => "0",
        incrementSequenceNumber: () => {},
      } as any
    }
    
    // Build a transaction to call the balance method
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_NETWORK,
    })
      .addOperation(
        contract.call("balance", addressScVal)
      )
      .setTimeout(30)
      .build()

    // Simulate the transaction (read-only, no signature needed)
    const simulation = await sorobanRpc.simulateTransaction(transaction)
    
    if (rpc.Api.isSimulationError(simulation)) {
      console.error("Simulation error:", simulation.error)
      return "0"
    }

    // Extract the result from simulation
    if (simulation.result && simulation.result.retval) {
      const balance = scValToNative(simulation.result.retval)
      // Convert from smallest unit (18 decimals) to readable format
      // The balance is in i128 format (BigInt)
      const balanceBigInt = BigInt(balance.toString())
      const balanceFormatted = (Number(balanceBigInt) / 1e18).toString()
      return balanceFormatted
    }
    
    return "0"
  } catch (error) {
    console.error("Error fetching USDC balance:", error)
    return "0"
  }
}

// Transfer USDC tokens (Soroban contract)
export async function transferUSDC(
  fromAddress: string,
  toAddress: string,
  amount: string
): Promise<string> {
  try {
    const kit = getStellarWalletsKit()
    if (!kit) {
      throw new Error("Wallet kit not available")
    }

    const server = getStellarServer()
    const sorobanRpc = getSorobanRpc()
    const sourceAccount = await server.loadAccount(fromAddress)
    
    const contract = getUSDCContract()
    
    // Convert amount to smallest unit (18 decimals)
    const amountInSmallestUnit = BigInt(Math.floor(parseFloat(amount) * 1e18))
    
    // Convert addresses and amount to ScVal
    const fromAddressScVal = Address.fromString(fromAddress).toScVal()
    const toAddressScVal = Address.fromString(toAddress).toScVal()
    const amountScVal = nativeToScVal(amountInSmallestUnit, { type: "i128" })

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
      .build()

    // Simulate transaction first to check if it will succeed
    const simulation = await sorobanRpc.simulateTransaction(transaction)
    
    if (rpc.Api.isSimulationError(simulation)) {
      throw new Error(`Simulation failed: ${simulation.error}`)
    }

    // Prepare transaction to get resource fees
    // This updates the transaction with proper fees for Soroban operations
    const preparedTransaction = await sorobanRpc.prepareTransaction(transaction)
    
    // Convert transaction to XDR for signing
    const transactionXdr = preparedTransaction.toXDR()
    
    // Sign transaction using wallet kit
    // User will need to confirm in their wallet - this may take time
    // The timeout set above ensures the transaction won't expire during this interaction
    const { signedTxXdr } = await kit.signTransaction(transactionXdr, {
      networkPassphrase: STELLAR_NETWORK,
    })
    
    if (!signedTxXdr) {
      throw new Error("Transaction was not signed")
    }
    
    // Convert signed XDR back to Transaction object
    const signedTx = TransactionBuilder.fromXDR(signedTxXdr, STELLAR_NETWORK)
    
    // Submit transaction immediately after signing
    // Official Stellar best practice: send immediately, don't modify after signing
    const response = await sorobanRpc.sendTransaction(signedTx)
    
    // Check if transaction was successful
    if (response.errorResult) {
      throw new Error(`Transaction failed: ${JSON.stringify(response.errorResult)}`)
    }
    
    if (!response.hash) {
      throw new Error("Transaction submission failed: no hash returned")
    }
    
    // Wait for transaction to be included in a ledger
    // Transactions can take a few seconds to be included, so we poll with retries
    let getTxResponse
    let retries = 0
    const maxRetries = 10
    const retryDelay = 2000 // 2 seconds
    
    while (retries < maxRetries) {
      getTxResponse = await sorobanRpc.getTransaction(response.hash)
      
      if (getTxResponse.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        // Transaction was successfully included
        return response.hash
      }
      
      if (getTxResponse.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error("Transaction failed to be included in ledger")
      }
      
      // If NOT_FOUND or PENDING, wait and retry
      if (getTxResponse.status === rpc.Api.GetTransactionStatus.NOT_FOUND || 
          getTxResponse.status === rpc.Api.GetTransactionStatus.PENDING) {
        retries++
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          continue
        }
      }
      
      // If we get here, transaction status is unknown
      break
    }
    
    // If we exhausted retries but have a hash, return it anyway
    // The transaction may still be processing
    if (response.hash) {
      return response.hash
    }
    
    throw new Error("Transaction not found after retries")
  } catch (error: any) {
    console.error("Error transferring USDC:", error)
    throw new Error(error?.message || "Failed to transfer USDC")
  }
}

// Validate Stellar address
export function isValidStellarAddress(address: string): boolean {
  try {
    Keypair.fromPublicKey(address)
    return true
  } catch {
    return false
  }
}
