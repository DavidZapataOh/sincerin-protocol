#!/bin/bash

# Configuration
CONTRACT_ID="CAVJG6UTRGYWCP73BWTOI4TER2E7ZRTUFO74HSG75D6WLDBPKFQNTIBG"
TOKEN_ID="CDIINEOGMMOHDUA23PZM24BQRPUQQN2PBK264DBPZ4XMINXGWY2XCYSQ"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
AMOUNT=1000000

# Create and fund user if doesn't exist
if ! stellar keys ls | grep -q "^user-testnet$"; then
  echo "🔑 Creating user account..."
  stellar keys generate --global user-testnet --network testnet
  
  USER=$(stellar keys address user-testnet)
  echo "📍 User address: $USER"
  echo ""
  echo "⏳ Please fund this account at:"
  echo "   https://laboratory.stellar.org/#account-creator?network=test"
  echo "   Address: $USER"
  echo ""
  read -p "Press Enter after funding the account..."
else
  USER=$(stellar keys address user-testnet)
fi

DEPLOYER=$(stellar keys address deployer-testnet)

echo "=========================================="
echo "🧪 Testing Encrypted Token Deposit Flow"
echo "=========================================="
echo ""
echo "📋 Configuration:"
echo "   Contract: $CONTRACT_ID"
echo "   Token: $TOKEN_ID"
echo "   User: $USER"
echo "   Amount: $AMOUNT"
echo ""

# Step 1: Transfer tokens from deployer to user
echo "💸 Step 1: Transferring TEST tokens from deployer to user..."
stellar contract invoke \
  --id $TOKEN_ID \
  --source-account deployer-testnet \
  --network testnet \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- transfer \
  --from $DEPLOYER \
  --to $USER \
  --amount 10000000

if [ $? -ne 0 ]; then
  echo "❌ Failed to transfer tokens"
  exit 1
fi

echo "✅ Tokens transferred successfully"
echo ""

# Step 2: Check token balance
echo "💰 Step 2: Checking user token balance..."
BALANCE=$(stellar contract invoke \
  --id $TOKEN_ID \
  --source-account user-testnet \
  --network testnet \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- balance \
  --id $USER)

echo "   Balance: $BALANCE"
echo ""

# Step 3: Make deposit
echo "📥 Step 3: Requesting deposit from user..."
stellar contract invoke \
  --id $CONTRACT_ID \
  --source-account user-testnet \
  --network testnet \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  -- request_deposit \
  --user $USER \
  --amount $AMOUNT \
  --encrypted_index "0000000000000000000000000000000000000000000000000000000000000001"

if [ $? -ne 0 ]; then
  echo "❌ Deposit request failed"
  exit 1
fi

echo ""
echo "✅ Deposit request sent!"
echo ""
echo "🔍 Now check your server terminal!"
echo "   You should see the server automatically:"
echo "   1. Detect the 'deposit_requested' event"
echo "   2. Generate a symmetric encryption key"
echo "   3. Encrypt the balance (amount: $AMOUNT)"
echo "   4. Store encrypted data on-chain"
echo ""
echo "🎉 Test complete!"
