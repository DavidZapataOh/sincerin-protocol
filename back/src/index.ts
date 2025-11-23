import express from "express";
import dotenv from "dotenv";
import { EventListener } from "./services/EventListener";
import { ContractInvoker } from "./services/ContractInvoker";
import { StellarConfig, ParsedEvent } from "./types";
import { StellarUtils } from "./utils/stellar";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

// Stellar configuration
const config: StellarConfig = {
  rpcUrl: process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org	",
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

const contractInvoker = new ContractInvoker(config);

// ============================================================================
// Event Handlers - Customize these based on your contract events
// ============================================================================

/**
 * Example: Handle a specific event type
 * Replace 'transfer' with your actual event name
 */
eventListener.registerHandler("transfer", async (event: ParsedEvent) => {
  const eventData = StellarUtils.extractEventData(event);
  console.log("Transfer event detected:", eventData);

  // Example: React to the event by calling another contract method
  try {
    // Uncomment and customize based on your contract methods
    // const args = contractInvoker.createArgs(eventData.data.amount);
    // await contractInvoker.invokeContract('process_transfer', args);
  } catch (error) {
    console.error("Error processing transfer event:", error);
  }
});

/**
 * Example: Handle all events with a wildcard handler
 */
eventListener.registerWildcardHandler(async (event: ParsedEvent) => {
  const eventData = StellarUtils.extractEventData(event);
  console.log("Event received:", {
    id: event.id,
    type: event.type,
    contractId: event.contractId,
    topics: eventData.topics,
    data: eventData.data,
  });
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
  });
});

/**
 * Manually invoke a contract method
 */
app.post("/invoke", async (req, res) => {
  try {
    const { methodName, args, contractId } = req.body;

    if (!methodName) {
      return res.status(400).json({ error: "methodName is required" });
    }

    // Convert args to ScVal if provided
    const scValArgs = args ? contractInvoker.createArgs(...args) : [];

    const result = await contractInvoker.invokeContract(
      methodName,
      scValArgs,
      contractId
    );

    res.json({ success: true, result });
  } catch (error: any) {
    console.error("Error invoking contract:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Read contract data (simulation only, no transaction)
 */
app.post("/read", async (req, res) => {
  try {
    const { methodName, args, contractId } = req.body;

    if (!methodName) {
      return res.status(400).json({ error: "methodName is required" });
    }

    const scValArgs = args ? contractInvoker.createArgs(...args) : [];

    const result = await contractInvoker.readContract(
      methodName,
      scValArgs,
      contractId
    );

    res.json({ success: true, result });
  } catch (error: any) {
    console.error("Error reading contract:", error);
    res.status(500).json({ error: error.message });
  }
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

// ============================================================================
// Server Startup
// ============================================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`RPC URL: ${config.rpcUrl}`);
  console.log(`Contract ID: ${config.contractId || "Not configured"}`);
  console.log("");

  // Auto-start event listener if contract ID is configured
  if (config.contractId && config.sourceSecretKey) {
    console.log("Starting event listener...");
    try {
      await eventListener.start();
      console.log("Event listener started successfully");
    } catch (error) {
      console.error("Failed to start event listener:", error);
    }
  } else {
    console.log("⚠️  Contract ID or Secret Key not configured");
    console.log("Please set CONTRACT_ID and SOURCE_SECRET_KEY in .env file");
    console.log("Event listener will not start automatically");
  }
});

export { eventListener, contractInvoker };
