# Stellar Encrypted Token Contract

A server-assisted encrypted token balance system for Stellar (Soroban), ported from the Ethereum/BSC version.

## Overview

This contract enables privacy-enhanced token management where:
- Users deposit tokens into the contract
- A trusted server encrypts balances using AES-256-GCM
- Encrypted data is stored on-chain
- Multiple layers of encryption protect user privacy

## Architecture

### Privacy Layers

1. **Encrypted User Index**: User addresses are mapped to encrypted indices, breaking the direct link between address and balance
2. **Encrypted Balance**: Actual balance encrypted with a random symmetric key (AES-256-GCM)
3. **Dual-Encrypted Keys**: Symmetric key encrypted separately for both user and server
4. **Server-Side Decryption**: Only the server can decrypt user indices and process deposits

### Contract Functions

#### Initialization
```rust
fn initialize(env: Env, server_manager: Address, token_contract: Address)
```
Initialize the contract with the server manager address and token contract address.

#### User Functions

**Authenticate User**
```rust
fn authenticate_user(env: Env, user: Address, encrypted_index: Bytes)
```
User authenticates by providing an encrypted index derived from their signature.

**Request Deposit**
```rust
fn request_deposit(env: Env, user: Address, amount: i128, encrypted_index: Bytes)
```
User deposits tokens and emits an event for the server to process. Auto-authenticates if needed.

#### Server Functions (onlyServerManager)

**Store Deposit**
```rust
fn store_deposit(
    env: Env,
    request_id: BytesN<32>,
    user_index: BytesN<32>,
    encrypted_amount: Bytes,
    encrypted_key_user: Bytes,
    encrypted_key_server: Bytes,
)
```
Server stores encrypted balance data after processing a deposit request.

#### View Functions

```rust
fn get_user_index_by_address(env: Env, user_address: Address) -> Bytes
fn get_encrypted_balance(env: Env, user_index: BytesN<32>) -> EncryptedBalance
fn deposit_completed(env: Env, request_id: BytesN<32>) -> bool
fn encrypted_supply(env: Env) -> i128
fn get_server_manager(env: Env) -> Address
fn get_token_contract(env: Env) -> Address
```

### Events

**user_authenticated**
```rust
(String("user_authenticated"), (user: Address, encrypted_index: Bytes))
```

**deposit_requested**
```rust
(String("deposit_requested"), (request_id: BytesN<32>, packed_data: Bytes, encrypted_index: Bytes))
```

**balance_stored**
```rust
(String("balance_stored"), (
    request_id: BytesN<32>,
    user: Address,
    encrypted_amount: Bytes,
    encrypted_key_user: Bytes,
    encrypted_key_server: Bytes
))
```

## Building and Deploying

### Prerequisites

1. Install Stellar CLI:
```bash
cargo install --locked stellar-cli --features opt
```

2. Install Rust target:
```bash
rustup target add wasm32-unknown-unknown
```

3. Configure Stellar CLI for Futurenet:
```bash
stellar network add \
  --global futurenet \
  --rpc-url https://rpc-futurenet.stellar.org \
  --network-passphrase "Test SDF Future Network ; October 2022"
```

4. Create and fund an account:
```bash
stellar keys generate --global default --network futurenet
stellar keys address default

# Fund at: https://laboratory.stellar.org/#account-creator?network=futurenet
```

### Build

```bash
stellar contract build
```

This creates: `target/wasm32-unknown-unknown/release/encrypted_token.wasm`

### Deploy

Option 1: Use the deployment script (recommended):
```bash
chmod +x deploy.sh
./deploy.sh
```

Option 2: Manual deployment:
```bash
stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/encrypted_token.wasm \
    --source-account default \
    --network futurenet
```

Save the returned contract ID.

### Initialize

After deployment, initialize the contract:

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account default \
  --network futurenet \
  -- initialize \
  --server_manager <SERVER_MANAGER_PUBLIC_KEY> \
  --token_contract <TOKEN_CONTRACT_ID>
```

Parameters:
- `server_manager`: Public key of the server that will process deposits
- `token_contract`: Contract ID of the token to be deposited (must be a Stellar Asset Contract)

## Data Flow

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │ 1. Signs message & creates encrypted index
       │ 2. Calls request_deposit(amount, encrypted_index)
       ▼
┌─────────────────────────────────────┐
│   Smart Contract                    │
│  - Transfers tokens to contract     │
│  - Auto-stores encrypted index      │
│  - Emits deposit_requested event    │
└──────┬──────────────────────────────┘
       │ 3. Event emitted
       ▼
┌─────────────────────────────────────┐
│   Server (Event Listener)           │
│  - Fetches encrypted index          │
│  - Decrypts index                   │
│  - Generates symmetric key          │
│  - Encrypts balance                 │
│  - Encrypts key for user & server   │
└──────┬──────────────────────────────┘
       │ 4. Calls store_deposit(...)
       ▼
┌─────────────────────────────────────┐
│   Smart Contract                    │
│  - Stores encrypted data            │
│  - Maps userIndex => encrypted data │
│  - Emits balance_stored event       │
└─────────────────────────────────────┘
```

## Testing

Run the test suite:

```bash
cargo test
```

## Integration with Event Listener

The encrypted token contract works with the Node.js event listener server in `back/`:

1. Deploy the contract and note the CONTRACT_ID
2. Configure `back/.env`:
   ```env
   CONTRACT_ID=<your_contract_id>
   SOURCE_SECRET_KEY=<server_manager_secret>
   STELLAR_RPC_URL=https://rpc-futurenet.stellar.org
   STELLAR_NETWORK_PASSPHRASE=Test SDF Future Network ; October 2022
   ```
3. Start the server:
   ```bash
   cd ../../back
   npm run dev:encrypted
   ```

The server will automatically:
- Listen for `deposit_requested` events
- Encrypt balances with AES-256-GCM
- Store encrypted data on-chain via `store_deposit`

## Security Considerations

⚠️ **This is a demonstration implementation**

For production use:
- Replace simplified hash-based encryption with proper ECIES
- Use hardware security modules (HSM) for server keys
- Implement key rotation mechanisms
- Add rate limiting and access controls
- Conduct comprehensive security audits
- Consider using Stellar's native multisig for server key management

## Differences from Ethereum/BSC Version

1. **Storage Model**: Uses Stellar's persistent/temporary/instance storage instead of Solidity mappings
2. **Events**: Stellar events use topics differently; data passed as tuples
3. **Authorization**: Uses Stellar's `require_auth()` instead of `msg.sender`
4. **Token Standard**: Uses Stellar Asset Contract (SAC) instead of ERC20
5. **Data Types**: Uses Soroban SDK types (Bytes, BytesN, Address) instead of Solidity types

## License

ISC
