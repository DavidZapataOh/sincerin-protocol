import { rpc } from "@stellar/stellar-sdk";
import {
  EventHandler,
  ParsedEvent,
  EventFilterCriteria,
  StellarConfig,
} from "../types";
import { StellarUtils } from "../utils/stellar";

export class EventListener {
  private server: rpc.Server;
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private lastProcessedLedger: number = 0;
  private isRunning: boolean = false;
  private pollIntervalMs: number;
  private filterCriteria: EventFilterCriteria;
  private ledgerDelay: number = 10; // Wait 10 ledgers (~50 seconds) for events to be indexed
  private lastProcessedEventId: string = ""; // Track last processed event for deduplication

  constructor(config: StellarConfig, filterCriteria?: EventFilterCriteria) {
    this.server = new rpc.Server(config.rpcUrl, {
      allowHttp: config.rpcUrl.startsWith("http://"),
    });
    this.pollIntervalMs = config.pollIntervalMs;
    this.filterCriteria = filterCriteria || {};
  }

  /**
   * Register an event handler for a specific event type
   */
  registerHandler(
    eventType: string,
    handler: (event: ParsedEvent) => Promise<void>
  ): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }

    this.eventHandlers.get(eventType)!.push({
      eventType,
      handler,
    });

    console.log(`Registered handler for event type: ${eventType}`);
  }

  /**
   * Register a wildcard handler that processes all events
   */
  registerWildcardHandler(
    handler: (event: ParsedEvent) => Promise<void>
  ): void {
    this.registerHandler("*", handler);
  }

  /**
   * Start listening for events
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log("Event listener is already running");
      return;
    }

    this.isRunning = true;
    console.log("Starting event listener...");

    // Get the latest ledger to start from
    if (this.lastProcessedLedger === 0) {
      const latestLedger = await this.server.getLatestLedger();
      this.lastProcessedLedger =
        this.filterCriteria.startLedger || latestLedger.sequence;
      console.log(`Starting from ledger: ${this.lastProcessedLedger}`);
    }

    this.poll();
  }

  /**
   * Stop listening for events
   */
  stop(): void {
    this.isRunning = false;
    console.log("Event listener stopped");
  }

  /**
   * Poll for new events
   */
  private async poll(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.fetchAndProcessEvents();
      } catch (error) {
        console.error("Error polling for events:", error);
      }

      // Wait before next poll
      await this.sleep(this.pollIntervalMs);
    }
  }

  /**
   * Fetch and process new events
   *
   * NOTE: Stellar RPC has issues with startLedger/endLedger filtering.
   * We query recent events and filter/deduplicate on our side.
   */
  private async fetchAndProcessEvents(): Promise<void> {
    try {
      const latestLedger = await this.server.getLatestLedger();

      console.log(`🔍 Polling (latest ledger: ${latestLedger.sequence})...`);
      const filters = this.buildFilters();

      // Query recent events (look back 1000 ledgers)
      const eventResponse = await this.server.getEvents({
        startLedger: latestLedger.sequence - 1000,
        endLedger: latestLedger.sequence,
        filters: filters,
      });

      console.log(
        `📊 Response: ${eventResponse.events?.length || 0} events found`
      );

      if (eventResponse.events && eventResponse.events.length > 0) {
        let newEventCount = 0;
        //console.log({ events: JSON.stringify(eventResponse.events) });
        for (const rawEvent of eventResponse.events) {
          const parsedEvent = StellarUtils.parseEvent(rawEvent);
          // Only process events newer than our last processed ledger
          console.log(this.lastProcessedLedger, parsedEvent.ledger);
          if (parsedEvent.ledger > this.lastProcessedLedger) {
            // Deduplicate by event ID
            if (parsedEvent.id !== this.lastProcessedEventId) {
              console.log({ parsedEvent });
              await this.processEvent(parsedEvent);
              this.lastProcessedEventId = parsedEvent.id;
              newEventCount++;
            }
          }
        }

        if (newEventCount > 0) {
          console.log(`✅ Processed ${newEventCount} new events`);
        }
      }

      // Update last processed ledger (with delay)
      this.lastProcessedLedger = latestLedger.sequence - this.ledgerDelay;
    } catch (error) {
      console.error("Error fetching events:", error);
      throw error;
    }
  }

  /**
   * Build event filters based on criteria
   *
   * NOTE: Stellar RPC has known event indexing delays, especially on Testnet.
   * Events may not be immediately available via getEvents even though they exist.
   * According to Stellar docs:
   * - RPC retains 24 hours of events by default (up to 7 days max)
   * - Events may have indexing delays
   * - Best practice: use pagination with cursors and deduplicate by event.id
   */
  private buildFilters(): rpc.Api.EventFilter[] {
    const filters: rpc.Api.EventFilter[] = [];

    // Add contract-specific filter
    if (
      this.filterCriteria.contractIds &&
      this.filterCriteria.contractIds.length > 0
    ) {
      filters.push({
        type: "contract",
        contractIds: this.filterCriteria.contractIds,
      });
    } else {
      // Fallback to all contract events if no specific contract IDs
      filters.push({
        type: "contract",
      });
    }

    return filters;
  }

  /**
   * Process a single event
   */
  private async processEvent(event: ParsedEvent): Promise<void> {
    try {
      console.log(
        `\n📥 Received event ${event.id} from contract ${event.contractId}`
      );

      // Only process events from our contract if filterCriteria specifies contractIds
      if (
        this.filterCriteria.contractIds &&
        this.filterCriteria.contractIds.length > 0
      ) {
        console.log({
          contractIds: this.filterCriteria.contractIds,
          eventId: String(event.contractId),
        });
        if (
          !this.filterCriteria.contractIds.includes(String(event.contractId))
        ) {
          console.log(`   ⏭️  Skipping event from different contract`);
          return;
        }
      }

      const eventData = StellarUtils.extractEventData(event);
      console.log(
        `\n🔔 Processing event ${event.id} from OUR contract ${String(
          event.contractId
        )}`
      );
      console.log(
        "Event data:",
        JSON.stringify(
          eventData,
          (_key, value) =>
            typeof value === "bigint" ? value.toString() : value,
          2
        )
      );

      // Extract event type from topics (usually first topic)
      const eventType = eventData.topics[0] || "unknown";

      // Call specific handlers
      const specificHandlers = this.eventHandlers.get(eventType) || [];
      for (const { handler } of specificHandlers) {
        await handler(event);
      }

      // Call wildcard handlers
      const wildcardHandlers = this.eventHandlers.get("*") || [];
      for (const { handler } of wildcardHandlers) {
        await handler(event);
      }
    } catch (error) {
      console.error(`Error processing event ${event.id}:`, error);
    }
  }

  /**
   * Helper to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current status
   */
  getStatus(): { isRunning: boolean; lastProcessedLedger: number } {
    return {
      isRunning: this.isRunning,
      lastProcessedLedger: this.lastProcessedLedger,
    };
  }
}
