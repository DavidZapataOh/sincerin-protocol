#!/bin/bash

# Simple test using a native token contract (not SAC)
# We'll deploy a custom token contract that doesn't require trustlines

CONTRACT_ID="CAVJG6UTRGYWCP73BWTOI4TER2E7ZRTUFO74HSG75D6WLDBPKFQNTIBG"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
AMOUNT=1000000

# Use deployer as both token holder and depositor for simplicity
USER=$(stellar keys address deployer-testnet)

echo "=========================================="
echo "🧪 Testing Encrypted Token Deposit Flow"
echo "=========================================="
echo ""
echo "📋 Configuration:"
echo "   Contract: $CONTRACT_ID"
echo "   User: $USER"
echo "   Amount: $AMOUNT"
echo ""
echo "⚠️  Note: This test skips token transfer verification"
echo "   We're testing the encrypted balance storage flow directly"
echo ""

# Make deposit directly (the contract will fail on token transfer, but let's see the event)
echo "📥 Requesting deposit (this may fail on token transfer, but will emit event)..."
stellar contract invoke \
  --id $CONTRACT_ID \
  --source-account deployer-testnet \
  --network testnet \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- request_deposit \
  --user $USER \
  --amount $AMOUNT \
  --encrypted_index "0000000000000000000000000000000000000000000000000000000000000001" 2>&1

echo ""
echo "🔍 Check your server terminal to see if it detected any events!"
echo ""
