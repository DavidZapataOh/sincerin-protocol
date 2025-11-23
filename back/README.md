# Stellar Futurenet Event Server

A Node.js server that listens to Stellar smart contract events on Futurenet and performs actions by invoking contract methods.

## Features

- **Event Listening**: Continuously polls Stellar Futurenet RPC for smart contract events
- **Event Handlers**: Register custom handlers for specific event types or all events
- **Contract Invocation**: Call smart contract methods in response to events
- **REST API**: HTTP endpoints for manual contract invocation and server control
- **TypeScript**: Full type safety with TypeScript

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure your settings:

```env
# Stellar Configuration
STELLAR_RPC_URL=https://rpc-futurenet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Future Network ; October 2022

# Server Configuration
PORT=3000

# Contract Configuration
CONTRACT_ID=YOUR_CONTRACT_ID_HERE
SOURCE_SECRET_KEY=YOUR_SECRET_KEY_HERE

# Event Polling
POLL_INTERVAL_MS=5000
```

**Important**:
- Get a Futurenet account and fund it at: https://laboratory.stellar.org/#account-creator?network=futurenet
- Deploy your contract and get the CONTRACT_ID
- Never commit your SECRET_KEY to version control

### 3. Run the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Build TypeScript:
```bash
npm run build
```

## Architecture

### Core Components

1. **EventListener** ([src/services/EventListener.ts](src/services/EventListener.ts))
   - Polls Stellar RPC for new events
   - Manages event handlers
   - Tracks processed ledgers to avoid duplicates

2. **ContractInvoker** ([src/services/ContractInvoker.ts](src/services/ContractInvoker.ts))
   - Invokes smart contract methods
   - Handles transaction building, simulation, and submission
   - Provides read-only contract queries

3. **StellarUtils** ([src/utils/stellar.ts](src/utils/stellar.ts))
   - Utility functions for Stellar operations
   - ScVal conversion helpers

## Usage

### Registering Event Handlers

Edit [src/index.ts](src/index.ts) to add your custom event handlers:

```typescript
// Handle a specific event type
eventListener.registerHandler('transfer', async (event: ParsedEvent) => {
  const eventData = StellarUtils.extractEventData(event);
  console.log('Transfer event:', eventData);

  // React to the event
  const args = contractInvoker.createArgs(eventData.data.amount);
  await contractInvoker.invokeContract('process_transfer', args);
});

// Handle all events
eventListener.registerWildcardHandler(async (event: ParsedEvent) => {
  console.log('Any event:', event);
});
```

### REST API Endpoints

#### Health Check
```bash
GET /health
```

Returns server status and configuration.

#### Invoke Contract Method
```bash
POST /invoke
Content-Type: application/json

{
  "methodName": "increment",
  "args": [1, "hello"],
  "contractId": "OPTIONAL_CONTRACT_ID"
}
```

Submits a transaction to invoke a contract method.

#### Read Contract (Simulation Only)
```bash
POST /read
Content-Type: application/json

{
  "methodName": "get_count",
  "args": [],
  "contractId": "OPTIONAL_CONTRACT_ID"
}
```

Reads contract state without submitting a transaction.

#### Event Listener Control
```bash
# Start listening
POST /start

# Stop listening
POST /stop

# Get status
GET /status
```

## Example: Complete Event Flow

1. **Contract emits event** → Smart contract on Stellar Futurenet emits an event

2. **Server detects event** → EventListener polls RPC and finds the new event

3. **Handler processes event** → Your registered handler receives the parsed event

4. **Server reacts** → ContractInvoker calls another contract method

```typescript
// Example: Auction contract
eventListener.registerHandler('bid_placed', async (event: ParsedEvent) => {
  const eventData = StellarUtils.extractEventData(event);
  const { bidder, amount } = eventData.data;

  console.log(`New bid: ${amount} from ${bidder}`);

  // Check if bid is winning and update state
  const currentHighest = await contractInvoker.readContract('get_highest_bid', []);

  if (amount > currentHighest) {
    // Process winning bid
    await contractInvoker.invokeContract(
      'set_winner',
      contractInvoker.createArgs(bidder, amount)
    );
  }
});
```

## Event Structure

Events received from Stellar have the following structure:

```typescript
interface ParsedEvent {
  id: string;              // Unique event ID
  type: string;            // Event type (e.g., "contract")
  ledger: number;          // Ledger sequence number
  contractId: string;      // Contract that emitted the event
  topic: xdr.ScVal[];      // Event topics (usually includes event name)
  value: xdr.ScVal;        // Event data
  txHash: string;          // Transaction hash
}
```

Use `StellarUtils.extractEventData(event)` to convert ScVal to JavaScript values:

```typescript
const eventData = StellarUtils.extractEventData(event);
// { topics: ["transfer"], data: { from: "G...", to: "G...", amount: 1000 } }
```

## Smart Contract Integration

### Contract Event Emission (Rust)

Your Stellar smart contract should emit events:

```rust
pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
    // ... transfer logic ...

    // Emit event
    env.events().publish(
        (symbol_short!("transfer"),),
        (from.clone(), to.clone(), amount)
    );
}
```

### Server-Side Handler

```typescript
eventListener.registerHandler('transfer', async (event: ParsedEvent) => {
  const { topics, data } = StellarUtils.extractEventData(event);
  // topics[0] = "transfer"
  // data = { from: "...", to: "...", amount: 1000 }
});
```

## Troubleshooting

### Events Not Appearing

1. Check contract ID is correct in `.env`
2. Verify events are being emitted by your contract
3. Check server logs for errors
4. Ensure RPC URL is accessible: `curl https://rpc-futurenet.stellar.org`

### Transaction Failures

1. Verify account has enough XLM for fees
2. Check simulation errors in logs
3. Ensure contract method signatures match
4. Verify network passphrase is correct

### RPC Rate Limits

If you're hitting rate limits, increase `POLL_INTERVAL_MS` in `.env`:

```env
POLL_INTERVAL_MS=10000  # Poll every 10 seconds instead of 5
```

## Security Notes

- **Never commit `.env` file** - it contains your secret key
- **Use testnet/futurenet only** - this is for development
- **Validate event data** - don't trust event data blindly
- **Handle errors gracefully** - failed transactions shouldn't crash the server

## Resources

- [Stellar Documentation](https://developers.stellar.org/)
- [Stellar SDK](https://github.com/stellar/js-stellar-sdk)
- [Soroban Smart Contracts](https://soroban.stellar.org/docs)
- [Futurenet RPC](https://rpc-futurenet.stellar.org/)

## License

ISC
