import express from "express";
import dotenv from "dotenv";
import { EventListener } from "./services/EventListener";
import { StellarEncryptedTokenService } from "./services/StellarEncryptedTokenService";
import { StellarConfig, ParsedEvent } from "./types";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

// Stellar configuration
const config: StellarConfig = {
  rpcUrl: process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org",
  networkPassphrase:
    process.env.STELLAR_NETWORK_PASSPHRASE ||
    "Test SDF Future Network ; October 2022",
  contractId: process.env.CONTRACT_ID || "",
  sourceSecretKey: process.env.SOURCE_SECRET_KEY || "",
  pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || "5000"),
};

// Initialize services
const eventListener = new EventListener(config, {
  contractIds: config.contractId ? [config.contractId] : undefined,
});

const encryptedTokenService = new StellarEncryptedTokenService(config);

// ============================================================================
// Event Handlers for Encrypted Token System
// ============================================================================

/**
 * Handle deposit_requested events
 * When a user requests a deposit, the server:
 * 1. Generates or retrieves a symmetric key for the user
 * 2. Encrypts the new balance with the symmetric key
 * 3. Encrypts the symmetric key for both user and server
 * 4. Stores everything on-chain
 */
eventListener.registerHandler(
  "deposit_requested",
  async (event: ParsedEvent) => {
    console.log("\n🎯 Deposit requested event detected");
    await encryptedTokenService.handleDepositRequest(event);
  }
);

/**
 * Handle transfer_requested events
 * When a user requests a transfer, the server:
 * 1. Decrypts the receiver index and amount
 * 2. Gets current balances for sender and receiver
 * 3. Validates sender has sufficient balance
 * 4. Calculates new balances
 * 5. Re-encrypts both balances
 * 6. Calls process_transfer on contract
 */
eventListener.registerHandler(
  "transfer_requested",
  async (event: ParsedEvent) => {
    console.log("\n🎯 Transfer requested event detected");
    await encryptedTokenService.handleTransferRequest(event);
  }
);

/**
 * Handle balance_stored events
 * Emitted after the server successfully stores encrypted data
 */
eventListener.registerHandler("balance_stored", async (event: ParsedEvent) => {
  console.log("✅ Balance stored event:", event.id);
});

/**
 * Handle transfer_completed events
 * Emitted after the server successfully processes a transfer
 */
eventListener.registerHandler("transfer_completed", async (event: ParsedEvent) => {
  console.log("✅ Transfer completed event:", event.id);
});

/**
 * Handle user_authenticated events
 * Emitted when a user authenticates with their encrypted index
 */
eventListener.registerHandler(
  "user_authenticated",
  async (event: ParsedEvent) => {
    console.log("👤 User authenticated event:", event.id);
  }
);

/**
 * Log all events for debugging
 */
eventListener.registerWildcardHandler(async (event: ParsedEvent) => {
  const { topics, data } =
    require("./utils/stellar").StellarUtils.extractEventData(event);
  console.log(`\n📡 Event: ${topics[0] || "unknown"}`);
  console.log(`   Contract: ${event.contractId}`);
  console.log(`   Ledger: ${event.ledger}`);
  console.log(`   TX: ${event.txHash}`);
});

// ============================================================================
// REST API Endpoints
// ============================================================================

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  const status = eventListener.getStatus();
  res.json({
    status: "ok",
    eventListener: status,
    config: {
      rpcUrl: config.rpcUrl,
      contractId: config.contractId,
      pollIntervalMs: config.pollIntervalMs,
    },
    service: "Stellar Encrypted Token Server",
  });
});

/**
 * Get event listener status
 */
app.get("/status", (req, res) => {
  const status = eventListener.getStatus();
  res.json(status);
});

/**
 * Start event listener
 */
app.post("/start", async (req, res) => {
  try {
    await eventListener.start();
    res.json({ success: true, message: "Event listener started" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stop event listener
 */
app.post("/stop", (req, res) => {
  eventListener.stop();
  res.json({ success: true, message: "Event listener stopped" });
});

/**
 * Get server info
 */
app.get("/info", (req, res) => {
  console.log("Network: ", config.networkPassphrase);
  res.json({
    name: "Stellar Encrypted Token Server",
    description: "Server-side encryption service for Stellar smart contracts",
    version: "1.0.0",
    network: config.networkPassphrase.includes("Future")
      ? "Futurenet"
      : config.networkPassphrase.includes("Test")
      ? "Testnet Network"
      : "Unknown",
    contractId: config.contractId || "Not configured",
  });
});

// ============================================================================
// Server Startup
// ============================================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 STELLAR ENCRYPTED TOKEN SERVER");
  console.log("=".repeat(70));
  console.log(`Server running on port ${PORT}`);
  console.log(`RPC URL: ${config.rpcUrl}`);
  console.log(`Network: ${config.networkPassphrase}`);
  console.log(`Contract ID: ${config.contractId || "Not configured"}`);
  console.log("=".repeat(70));
  console.log("");

  // Auto-start event listener if contract ID is configured
  if (config.contractId && config.sourceSecretKey) {
    console.log("🎧 Starting event listener...");
    try {
      await eventListener.start();
      console.log("✅ Event listener started successfully");
      console.log("📡 Listening for deposit and transfer requests...");
      console.log("");
    } catch (error) {
      console.error("❌ Failed to start event listener:", error);
    }
  } else {
    console.log("⚠️  Contract ID or Secret Key not configured");
    console.log("Please set CONTRACT_ID and SOURCE_SECRET_KEY in .env file");
    console.log("Event listener will not start automatically");
    console.log("");
  }

  console.log("💡 API Endpoints:");
  console.log(`   GET  http://localhost:${PORT}/health - Health check`);
  console.log(
    `   GET  http://localhost:${PORT}/status - Event listener status`
  );
  console.log(`   GET  http://localhost:${PORT}/info - Server info`);
  console.log(`   POST http://localhost:${PORT}/start - Start event listener`);
  console.log(`   POST http://localhost:${PORT}/stop - Stop event listener`);
  console.log("");
});

export { eventListener, encryptedTokenService };
