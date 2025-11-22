import { Contract, Keypair, rpc, xdr, scValToNative } from '@stellar/stellar-sdk';
import { ParsedEvent } from '../types';

export class StellarUtils {
  /**
   * Parse raw Stellar event into a more usable format
   */
  static parseEvent(event: rpc.Api.EventResponse): ParsedEvent {
    return {
      id: event.id,
      type: event.type,
      ledger: event.ledger,
      contractId: event.contractId,
      topic: event.topic,
      value: event.value,
      txHash: event.txHash,
    };
  }

  /**
   * Convert ScVal to native JavaScript types
   */
  static scValToJs(scVal: xdr.ScVal): any {
    try {
      return scValToNative(scVal);
    } catch (error) {
      console.error('Error converting ScVal:', error);
      return null;
    }
  }

  /**
   * Extract event data from topics and value
   */
  static extractEventData(event: ParsedEvent): {
    topics: any[];
    data: any;
  } {
    return {
      topics: event.topic.map(topic => this.scValToJs(topic)),
      data: this.scValToJs(event.value),
    };
  }

  /**
   * Format contract ID (remove 'C' prefix if present)
   */
  static formatContractId(contractId: string): string {
    return contractId.startsWith('C') ? contractId.substring(1) : contractId;
  }

  /**
   * Create a keypair from secret key
   */
  static getKeypair(secretKey: string): Keypair {
    return Keypair.fromSecret(secretKey);
  }

  /**
   * Get contract instance
   */
  static getContract(contractId: string): Contract {
    return new Contract(contractId);
  }
}
