# Sincerin Protocol - Backend Event Server

A Node.js server that listens to Stellar smart contract events and processes encrypted token deposits and transfers.

## Features

- **Event Listening**: Continuously polls Stellar Testnet RPC for smart contract events
- **Encrypted Deposits**: Detects deposit requests, encrypts balances with AES-256-GCM, and stores on-chain
- **Private Transfers**: Processes encrypted transfers between users without exposing amounts
- **Dual Encryption**: Symmetric keys encrypted separately for both user and server
- **REST API**: HTTP endpoints for server control and status monitoring
- **TypeScript**: Full type safety with TypeScript

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file:

```bash
cat > .env << EOF
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
CONTRACT_ID=YOUR_CONTRACT_ID_HERE
SOURCE_SECRET_KEY=YOUR_SERVER_SECRET_KEY_HERE
PORT=3000
POLL_INTERVAL_MS=5000
EOF
```

**Important**:
- Get a testnet account and fund it at: https://laboratory.stellar.org/#account-creator?network=test
- Deploy the encrypted token contract and get the CONTRACT_ID
- Never commit your SECRET_KEY to version control

### 3. Run the Server

Development mode (with auto-reload):
```bash
npm run dev:encrypted
```

Production mode:
```bash
npm start
```

Build TypeScript:
```bash
npm run build
```

## Testing the Full Flow

### Prerequisites

1. **Set up test accounts** (alice and bob):

```bash
# Generate alice's keypair
stellar keys generate alice --network testnet

# Generate bob's keypair
stellar keys generate bob --network testnet

# Fund both accounts with testnet XLM
stellar keys fund alice --network testnet
stellar keys fund bob --network testnet
```

2. **Get their addresses**:

```bash
stellar keys address alice
# Example output: GBGHDHW642US2JAZ6F7ARNHKN7U53JCZPGLTY4EWNKCWIKG6VRZTP36O

stellar keys address bob
# Example output: GCQY7WNKHLF3VZ4NJWQPJ3ZTXQX5VWQZQXQZQXQZQXQZQXQZQXQZQXQZ
```

3. **Assign user indices** (used for encryption):
   - Alice: `0x1111111111111111111111111111111111111111111111111111111111111111`
   - Bob: `0x2222222222222222222222222222222222222222222222222222222222222222`

### Step-by-Step Testing

**Terminal 1: Start the backend event listener**

```bash
npm run dev:encrypted
```

You should see:
```
🎧 Starting event listener...
✅ Event listener started successfully
📡 Listening for deposit and transfer requests...
```

**Terminal 2: Test deposit and transfer flow**

```bash
# Step 1: Alice deposits 5,000,000 stroops (0.5 XLM)
npx tsx request-deposit.ts alice 0x1111111111111111111111111111111111111111111111111111111111111111 5000000

# Step 2: Bob deposits 3,000,000 stroops (0.3 XLM)
npx tsx request-deposit.ts bob 0x2222222222222222222222222222222222222222222222222222222222222222 3000000

# Step 3: Alice transfers 1,000,000 stroops (0.1 XLM) to Bob
npx tsx request-transfer.ts alice 0x2222222222222222222222222222222222222222222222222222222222222222 1000000
```

**Expected Results:**

After Step 1 (Alice's deposit):
- Terminal 1 shows: `🎯 Deposit requested event detected`
- Server generates symmetric key, encrypts balance
- Contract stores Alice's encrypted balance
- Alice's balance: 5,000,000 stroops (encrypted)

After Step 2 (Bob's deposit):
- Terminal 1 shows: `🎯 Deposit requested event detected`
- Contract stores Bob's encrypted balance
- Bob's balance: 3,000,000 stroops (encrypted)

After Step 3 (Alice → Bob transfer):
- Terminal 1 shows: `🎯 Transfer requested event detected`
- Server decrypts receiver index and amount
- Server validates Alice has sufficient balance
- Server calculates new balances and re-encrypts
- Alice's new balance: 4,000,000 stroops (encrypted)
- Bob's new balance: 4,000,000 stroops (encrypted)

**Verify on Stellar Explorer:**

Visit [Stellar Expert Testnet](https://testnet.stellar.expert/) and search for your contract ID to see the transactions.

## Architecture

### Core Components

1. **EventListener** ([src/services/EventListener.ts](src/services/EventListener.ts))
   - Polls Stellar RPC for new events
   - Manages event handlers
   - Tracks processed ledgers to avoid duplicates

2. **StellarEncryptedTokenService** ([src/services/StellarEncryptedTokenService.ts](src/services/StellarEncryptedTokenService.ts))
   - Handles deposit requests
   - Handles transfer requests
   - Manages encryption/decryption of balances
   - Invokes contract methods

3. **EncryptionService** ([src/services/EncryptionService.ts](src/services/EncryptionService.ts))
   - AES-256-GCM encryption for balances
   - AES-256-CBC encryption for keys
   - Deterministic address-based encryption

### Data Flow

#### Deposit Flow

1. **User calls `request_deposit`**
   - User signs transaction with their wallet
   - Contract emits `deposit_requested` event
   - Event contains: user address, amount, encrypted index

2. **Server detects event**
   - EventListener picks up the event
   - Calls `handleDepositRequest` in StellarEncryptedTokenService

3. **Server processes deposit**
   - Generates/retrieves symmetric key for user
   - Encrypts balance with AES-256-GCM
   - Encrypts symmetric key twice (for user and server)
   - Calls `store_deposit` on contract

4. **Contract stores encrypted data**
   - Saves encrypted balance on-chain
   - Emits `balance_stored` event

#### Transfer Flow

1. **User calls `request_transfer`**
   - User encrypts receiver index and amount for server
   - Contract emits `transfer_requested` event

2. **Server detects event**
   - EventListener picks up the event
   - Calls `handleTransferRequest` in StellarEncryptedTokenService

3. **Server processes transfer**
   - Decrypts receiver index and amount
   - Fetches and decrypts sender's balance
   - Validates sender has sufficient funds
   - Calculates new balances
   - Re-encrypts both balances
   - Calls `process_transfer` on contract

4. **Contract updates balances**
   - Updates both encrypted balances on-chain
   - Emits `transfer_completed` event

## Available Scripts

### CLI Scripts

- **request-deposit.ts**: Request a deposit (converts to private)
  ```bash
  npx tsx request-deposit.ts <user_key_name> <user_index_hex> <amount>
  ```

- **request-transfer.ts**: Request a private transfer
  ```bash
  npx tsx request-transfer.ts <sender_key_name> <receiver_index_hex> <amount>
  ```

- **manual-store-deposit.ts**: Manually store a deposit (for testing)
  ```bash
  npx tsx manual-store-deposit.ts <user_address> <user_index_hex> <amount>
  ```

### REST API Endpoints

#### Server Status
```bash
GET /status
```
Returns event listener status.

#### Server Info
```bash
GET /info
```
Returns server configuration and info.

#### Start Event Listener
```bash
POST /start
```
Manually start the event listener.

#### Stop Event Listener
```bash
POST /stop
```
Manually stop the event listener.

## Event Handlers

The server registers handlers for these events:

- **deposit_requested**: User requests to convert tokens to private
- **transfer_requested**: User requests a private transfer
- **balance_stored**: Server successfully stored encrypted balance
- **transfer_completed**: Server successfully processed transfer
- **user_authenticated**: User authenticated with encrypted index

See [src/index-encrypted.ts](src/index-encrypted.ts) for handler implementations.

## Encryption Details

### Balance Encryption (AES-256-GCM)

- Random 32-byte symmetric key generated for each user
- Balance encrypted with this key
- Includes initialization vector (IV) and authentication tag
- Provides confidentiality and integrity

### Key Encryption (AES-256-CBC)

- Symmetric key encrypted separately for user and server
- Uses deterministic hash-based encryption
- User can decrypt with their address private key
- Server can decrypt with server private key

### User Index Encryption

- User's address mapped to encrypted index
- Breaks direct link between address and balance
- Index encrypted for server using address-based encryption

## Troubleshooting

### Events Not Appearing

1. Check CONTRACT_ID is correct in `.env`
2. Verify events are being emitted by your contract
3. Check server logs for errors
4. Ensure RPC URL is accessible

### Transaction Failures

1. Verify server account has enough XLM for fees
2. Check simulation errors in server logs
3. Ensure contract is initialized correctly
4. Verify network passphrase matches testnet

### Encryption Errors

1. Check server secret key is valid
2. Verify user indices are 32-byte hex strings
3. Ensure encryption service is imported correctly

## Security Notes

- **Never commit `.env` file** - it contains your server secret key
- **Use testnet only** - this is for development/demonstration
- **Validate event data** - don't trust event data blindly
- **Handle errors gracefully** - failed transactions shouldn't crash the server
- **Production considerations**:
  - Replace hash-based encryption with proper ECIES
  - Use hardware security modules (HSM) for server keys
  - Implement key rotation mechanisms
  - Add rate limiting and access controls
  - Conduct comprehensive security audits

## Resources

- [Stellar Documentation](https://developers.stellar.org/)
- [Stellar SDK](https://github.com/stellar/js-stellar-sdk)
- [Soroban Smart Contracts](https://soroban.stellar.org/docs)
- [Stellar Expert](https://stellar.expert/)

## License

ISC
