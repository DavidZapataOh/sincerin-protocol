import { rpc, xdr } from '@stellar/stellar-sdk';

export interface EventHandler {
  eventType: string;
  handler: (event: ParsedEvent) => Promise<void>;
}

export interface ParsedEvent {
  id: string;
  type: string;
  ledger: number;
  contractId: string;
  topic: xdr.ScVal[];
  value: xdr.ScVal;
  txHash: string;
}

export interface StellarConfig {
  rpcUrl: string;
  networkPassphrase: string;
  contractId: string;
  sourceSecretKey: string;
  pollIntervalMs: number;
}

export interface EventFilterCriteria {
  contractIds?: string[];
  topics?: xdr.ScVal[][];
  startLedger?: number;
}
