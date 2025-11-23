/**
 * Example event handlers for common Stellar smart contract patterns
 *
 * Copy these examples to src/index.ts and customize for your needs
 */

import { ParsedEvent } from '../src/types';
import { StellarUtils } from '../src/utils/stellar';
import { ContractInvoker } from '../src/services/ContractInvoker';

// ============================================================================
// Example 1: Token Transfer Handler
// ============================================================================

export function setupTransferHandler(
  eventListener: any,
  contractInvoker: ContractInvoker
) {
  eventListener.registerHandler('transfer', async (event: ParsedEvent) => {
    const { topics, data } = StellarUtils.extractEventData(event);

    console.log('Transfer detected:');
    console.log('  From:', data.from);
    console.log('  To:', data.to);
    console.log('  Amount:', data.amount);

    // Example: Log large transfers to another contract
    if (data.amount > 1000000) {
      try {
        const args = contractInvoker.createArgs(
          data.from,
          data.to,
          data.amount,
          event.txHash
        );
        await contractInvoker.invokeContract('log_large_transfer', args);
        console.log('Large transfer logged to audit contract');
      } catch (error) {
        console.error('Failed to log transfer:', error);
      }
    }
  });
}

// ============================================================================
// Example 2: Auction System
// ============================================================================

export function setupAuctionHandlers(
  eventListener: any,
  contractInvoker: ContractInvoker
) {
  // Handle new bids
  eventListener.registerHandler('bid_placed', async (event: ParsedEvent) => {
    const { data } = StellarUtils.extractEventData(event);

    console.log(`New bid placed:`);
    console.log(`  Bidder: ${data.bidder}`);
    console.log(`  Amount: ${data.amount}`);
    console.log(`  Auction ID: ${data.auction_id}`);

    try {
      // Check if this is the highest bid
      const currentHighest = await contractInvoker.readContract(
        'get_highest_bid',
        contractInvoker.createArgs(data.auction_id)
      );

      if (data.amount > currentHighest.amount) {
        // Update winner
        await contractInvoker.invokeContract(
          'update_winner',
          contractInvoker.createArgs(data.auction_id, data.bidder)
        );
        console.log('New highest bidder updated');
      }
    } catch (error) {
      console.error('Error processing bid:', error);
    }
  });

  // Handle auction end
  eventListener.registerHandler('auction_ended', async (event: ParsedEvent) => {
    const { data } = StellarUtils.extractEventData(event);

    console.log(`Auction ended:`);
    console.log(`  Auction ID: ${data.auction_id}`);
    console.log(`  Winner: ${data.winner}`);
    console.log(`  Final amount: ${data.final_amount}`);

    try {
      // Finalize the auction and transfer item to winner
      await contractInvoker.invokeContract(
        'finalize_auction',
        contractInvoker.createArgs(data.auction_id)
      );
      console.log('Auction finalized');
    } catch (error) {
      console.error('Error finalizing auction:', error);
    }
  });
}

// ============================================================================
// Example 3: Staking Rewards
// ============================================================================

export function setupStakingHandlers(
  eventListener: any,
  contractInvoker: ContractInvoker
) {
  // Handle staking deposits
  eventListener.registerHandler('staked', async (event: ParsedEvent) => {
    const { data } = StellarUtils.extractEventData(event);

    console.log(`Tokens staked:`);
    console.log(`  User: ${data.user}`);
    console.log(`  Amount: ${data.amount}`);

    // Could trigger reward calculation or notification
  });

  // Handle reward distribution
  eventListener.registerHandler('rewards_distributed', async (event: ParsedEvent) => {
    const { data } = StellarUtils.extractEventData(event);

    console.log(`Rewards distributed:`);
    console.log(`  Epoch: ${data.epoch}`);
    console.log(`  Total rewards: ${data.total_rewards}`);

    try {
      // Log to analytics contract
      await contractInvoker.invokeContract(
        'log_reward_epoch',
        contractInvoker.createArgs(data.epoch, data.total_rewards)
      );
    } catch (error) {
      console.error('Error logging rewards:', error);
    }
  });
}

// ============================================================================
// Example 4: Multi-Signature Wallet
// ============================================================================

export function setupMultisigHandlers(
  eventListener: any,
  contractInvoker: ContractInvoker
) {
  // Track proposal submissions
  eventListener.registerHandler('proposal_submitted', async (event: ParsedEvent) => {
    const { data } = StellarUtils.extractEventData(event);

    console.log(`New proposal submitted:`);
    console.log(`  Proposal ID: ${data.proposal_id}`);
    console.log(`  Proposer: ${data.proposer}`);
    console.log(`  Description: ${data.description}`);

    // Could send notification to other signers
  });

  // Track approvals and execute when threshold is met
  eventListener.registerHandler('proposal_approved', async (event: ParsedEvent) => {
    const { data } = StellarUtils.extractEventData(event);

    console.log(`Proposal approved by: ${data.approver}`);

    try {
      // Check if threshold is met
      const proposal = await contractInvoker.readContract(
        'get_proposal',
        contractInvoker.createArgs(data.proposal_id)
      );

      if (proposal.approvals >= proposal.threshold && !proposal.executed) {
        // Execute the proposal
        await contractInvoker.invokeContract(
          'execute_proposal',
          contractInvoker.createArgs(data.proposal_id)
        );
        console.log(`Proposal ${data.proposal_id} executed`);
      }
    } catch (error) {
      console.error('Error checking/executing proposal:', error);
    }
  });
}

// ============================================================================
// Example 5: Oracle Price Feeds
// ============================================================================

export function setupOracleHandlers(
  eventListener: any,
  contractInvoker: ContractInvoker
) {
  eventListener.registerHandler('price_updated', async (event: ParsedEvent) => {
    const { data } = StellarUtils.extractEventData(event);

    console.log(`Price updated:`);
    console.log(`  Asset: ${data.asset}`);
    console.log(`  New price: ${data.price}`);
    console.log(`  Timestamp: ${data.timestamp}`);

    try {
      // Example: Trigger liquidations if price crossed threshold
      const threshold = await contractInvoker.readContract(
        'get_liquidation_threshold',
        contractInvoker.createArgs(data.asset)
      );

      if (data.price < threshold) {
        console.log(`Price below threshold, triggering liquidation check`);
        await contractInvoker.invokeContract(
          'check_liquidations',
          contractInvoker.createArgs(data.asset)
        );
      }
    } catch (error) {
      console.error('Error processing price update:', error);
    }
  });
}

// ============================================================================
// Example 6: NFT Marketplace
// ============================================================================

export function setupMarketplaceHandlers(
  eventListener: any,
  contractInvoker: ContractInvoker
) {
  // Track listings
  eventListener.registerHandler('nft_listed', async (event: ParsedEvent) => {
    const { data } = StellarUtils.extractEventData(event);

    console.log(`NFT listed for sale:`);
    console.log(`  Token ID: ${data.token_id}`);
    console.log(`  Seller: ${data.seller}`);
    console.log(`  Price: ${data.price}`);

    // Could index in a database for faster queries
  });

  // Handle sales
  eventListener.registerHandler('nft_sold', async (event: ParsedEvent) => {
    const { data } = StellarUtils.extractEventData(event);

    console.log(`NFT sold:`);
    console.log(`  Token ID: ${data.token_id}`);
    console.log(`  Seller: ${data.seller}`);
    console.log(`  Buyer: ${data.buyer}`);
    console.log(`  Price: ${data.price}`);

    try {
      // Calculate and distribute royalties
      const royaltyInfo = await contractInvoker.readContract(
        'get_royalty_info',
        contractInvoker.createArgs(data.token_id)
      );

      if (royaltyInfo.percentage > 0) {
        await contractInvoker.invokeContract(
          'distribute_royalties',
          contractInvoker.createArgs(data.token_id, data.price)
        );
        console.log('Royalties distributed');
      }
    } catch (error) {
      console.error('Error processing sale:', error);
    }
  });
}

// ============================================================================
// Example 7: Generic Event Logger
// ============================================================================

export function setupGenericLogger(
  eventListener: any,
  contractInvoker: ContractInvoker
) {
  // Log all events to a database or external service
  eventListener.registerWildcardHandler(async (event: ParsedEvent) => {
    const { topics, data } = StellarUtils.extractEventData(event);

    const logEntry = {
      eventId: event.id,
      ledger: event.ledger,
      contractId: event.contractId,
      eventType: topics[0] || 'unknown',
      topics,
      data,
      txHash: event.txHash,
      timestamp: new Date().toISOString(),
    };

    console.log('Event log:', JSON.stringify(logEntry, null, 2));

    // Example: Store in database
    // await database.events.insert(logEntry);

    // Example: Send to analytics service
    // await analytics.track('stellar_event', logEntry);
  });
}
