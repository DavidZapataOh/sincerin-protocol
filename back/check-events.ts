import { rpc } from '@stellar/stellar-sdk';

const server = new rpc.Server('https://soroban-testnet.stellar.org', {
  allowHttp: false,
});

const contractId = 'CBETJ6H324J7JFXDASE2OWIQV6PCK62SG2RFGLIJUF5GCXZKI7N7B57Y';

async function checkEvents() {
  console.log('Fetching recent events for contract:', contractId);
  console.log('');

  try {
    const latestLedger = await server.getLatestLedger();
    console.log(`Latest ledger: ${latestLedger.sequence}`);

    // Look back 1000 ledgers (about 1.5 hours)
    const startLedger = latestLedger.sequence - 1000;

    console.log(`Searching ledgers ${startLedger} to ${latestLedger.sequence}...\n`);

    const response = await server.getEvents({
      startLedger,
      filters: [
        {
          type: 'contract',
          contractIds: [contractId],
        }
      ],
    });

    const eventCount = response.events ? response.events.length : 0;
    console.log(`Found ${eventCount} events`);
    console.log('');

    if (response.events && response.events.length > 0) {
      for (const event of response.events) {
        console.log('Event:', event.id);
        console.log('  Ledger:', event.ledger);
        console.log('  TX Hash:', event.txHash);
        console.log('  Type:', event.type);
        console.log('  Topic:', event.topic);
        console.log('');
      }
    } else {
      console.log('No events found for this contract in the last 1000 ledgers.');
      console.log('This could mean:');
      console.log('  1. No transactions have been sent to this contract recently');
      console.log('  2. The contract ID is incorrect');
      console.log('  3. Events are not being emitted by the contract');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkEvents();
