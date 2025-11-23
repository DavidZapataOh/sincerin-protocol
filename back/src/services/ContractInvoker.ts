import {
  rpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Operation,
  Keypair,
  Contract,
  xdr,
  scValToNative,
  nativeToScVal,
} from '@stellar/stellar-sdk';
import { StellarConfig } from '../types';
import { StellarUtils } from '../utils/stellar';

export class ContractInvoker {
  private server: rpc.Server;
  private sourceKeypair: Keypair;
  private networkPassphrase: string;
  private contractId: string;

  constructor(config: StellarConfig) {
    this.server = new rpc.Server(config.rpcUrl, {
      allowHttp: config.rpcUrl.startsWith('http://'),
    });
    this.sourceKeypair = StellarUtils.getKeypair(config.sourceSecretKey);
    this.networkPassphrase = config.networkPassphrase;
    this.contractId = config.contractId;
  }

  /**
   * Invoke a smart contract method
   */
  async invokeContract(
    methodName: string,
    args: xdr.ScVal[],
    contractId?: string
  ): Promise<rpc.Api.GetTransactionResponse> {
    const targetContractId = contractId || this.contractId;
    const contract = StellarUtils.getContract(targetContractId);

    console.log(`Invoking contract ${targetContractId}, method: ${methodName}`);

    try {
      // Get account
      const sourceAccount = await this.server.getAccount(this.sourceKeypair.publicKey());

      // Build operation
      const operation = contract.call(methodName, ...args);

      // Build transaction
      let transaction = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      // Simulate transaction
      console.log('Simulating transaction...');
      const simulateResponse = await this.server.simulateTransaction(transaction);

      if (rpc.Api.isSimulationError(simulateResponse)) {
        throw new Error(`Simulation error: ${JSON.stringify(simulateResponse)}`);
      }

      // Prepare and sign transaction
      transaction = rpc.assembleTransaction(transaction, simulateResponse).build();
      transaction.sign(this.sourceKeypair);

      // Submit transaction
      console.log('Submitting transaction...');
      const sendResponse = await this.server.sendTransaction(transaction);

      if (sendResponse.status !== 'PENDING') {
        throw new Error(`Transaction submission failed: ${JSON.stringify(sendResponse)}`);
      }

      console.log(`Transaction submitted: ${sendResponse.hash}`);

      // Wait for transaction result
      const result = await this.waitForTransaction(sendResponse.hash);

      if (result.status === 'SUCCESS') {
        console.log('Transaction successful!');
        const returnValue = result.returnValue;
        if (returnValue) {
          const nativeValue = scValToNative(returnValue);
          console.log('Return value:', nativeValue);
        }
      } else {
        console.error('Transaction failed:', result);
      }

      return result;
    } catch (error) {
      console.error('Error invoking contract:', error);
      throw error;
    }
  }

  /**
   * Helper method to create ScVal arguments from native JavaScript values
   */
  createArgs(...values: any[]): xdr.ScVal[] {
    return values.map(value => nativeToScVal(value));
  }

  /**
   * Wait for transaction to be confirmed
   */
  private async waitForTransaction(
    hash: string,
    maxAttempts: number = 30,
    delayMs: number = 2000
  ): Promise<rpc.Api.GetTransactionResponse> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await this.server.getTransaction(hash);

        if (response.status !== 'NOT_FOUND') {
          return response;
        }

        console.log(`Waiting for transaction ${hash}... (${attempts + 1}/${maxAttempts})`);
      } catch (error) {
        console.error('Error checking transaction status:', error);
      }

      await this.sleep(delayMs);
      attempts++;
    }

    throw new Error(`Transaction ${hash} not found after ${maxAttempts} attempts`);
  }

  /**
   * Helper to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Read contract data without invoking (simulation only)
   */
  async readContract(
    methodName: string,
    args: xdr.ScVal[],
    contractId?: string
  ): Promise<any> {
    const targetContractId = contractId || this.contractId;
    const contract = StellarUtils.getContract(targetContractId);

    console.log(`Reading contract ${targetContractId}, method: ${methodName}`);

    try {
      const sourceAccount = await this.server.getAccount(this.sourceKeypair.publicKey());

      const operation = contract.call(methodName, ...args);

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simulateResponse = await this.server.simulateTransaction(transaction);

      if (rpc.Api.isSimulationError(simulateResponse)) {
        throw new Error(`Simulation error: ${JSON.stringify(simulateResponse)}`);
      }

      const result = simulateResponse.result;
      if (result) {
        const returnValue = result.retval;
        return scValToNative(returnValue);
      }

      return null;
    } catch (error) {
      console.error('Error reading contract:', error);
      throw error;
    }
  }
}
