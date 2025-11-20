#!/bin/bash

# Stellar Encrypted Token Deployment Script
# Deploys the encrypted token contract to Stellar Futurenet

set -e

echo "=================================================="
echo "  Stellar Encrypted Token - Deployment Script"
echo "=================================================="
echo ""

# Check if stellar CLI is installed
if ! command -v stellar &> /dev/null; then
    echo "❌ Stellar CLI not found!"
    echo "   Please install from: https://developers.stellar.org/docs/tools/developer-tools"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NETWORK="futurenet"
CONTRACT_NAME="encrypted_token"

echo "📋 Configuration:"
echo "   Network: $NETWORK"
echo "   Contract: $CONTRACT_NAME"
echo ""

# Build the contract
echo "🔨 Building contract..."
stellar contract build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# Deploy the contract
echo "🚀 Deploying contract to $NETWORK..."
CONTRACT_ID=$(stellar contract deploy \
    --wasm target/wasm32-unknown-unknown/release/encrypted_token.wasm \
    --source-account default \
    --network $NETWORK)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contract deployed!${NC}"
echo ""
echo "=================================================="
echo "  Deployment Information"
echo "=================================================="
echo ""
echo "Contract ID: $CONTRACT_ID"
echo ""
echo "🌐 View on Stellar Explorer:"
echo "   https://futurenet.steexp.com/contract/$CONTRACT_ID"
echo ""
echo "=================================================="
echo ""

# Save contract ID to file
echo "$CONTRACT_ID" > .contract_id
echo "💾 Contract ID saved to .contract_id"
echo ""

echo "📝 Next steps:"
echo "   1. Set CONTRACT_ID in your .env file:"
echo "      CONTRACT_ID=$CONTRACT_ID"
echo ""
echo "   2. Initialize the contract with server manager and token contract:"
echo "      stellar contract invoke \\"
echo "        --id $CONTRACT_ID \\"
echo "        --source-account default \\"
echo "        --network futurenet \\"
echo "        -- initialize \\"
echo "        --server_manager <SERVER_MANAGER_ADDRESS> \\"
echo "        --token_contract <TOKEN_CONTRACT_ID>"
echo ""
echo "   3. Start the event listener server:"
echo "      cd ../back && npm run dev:encrypted"
echo ""
