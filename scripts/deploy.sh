#!/bin/bash
# Arbet devnet deployment script

set -e

echo "🚀 Deploying Arbet to Solana devnet..."

# Check prerequisites
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor not found. Install: avm install 0.30.0 && avm use 0.30.0"
    exit 1
fi

if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Install: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Set network to devnet
echo "📡 Setting network to devnet..."
solana config set --url https://api.devnet.solana.com

# Check balance
BALANCE=$(solana balance | awk '{print $1}')
echo "💰 Account balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 0.5" | bc -l) )); then
    echo "⚠️  Requesting airdrop..."
    solana airdrop 2 --url devnet
fi

# Build program
echo "🔨 Building Arbet program..."
cd contracts
anchor build

# Deploy to devnet
echo "📤 Deploying to devnet..."
anchor deploy --provider.cluster devnet

# Extract program ID
PROGRAM_ID=$(solana address -p contracts/target/deploy/arbet-keypair.json)
echo ""
echo "✅ Deployment successful!"
echo "📦 Program ID: $PROGRAM_ID"
echo ""
echo "Update Anchor.toml with:"
echo "  [programs.devnet]"
echo "  arbet = \"$PROGRAM_ID\""
echo ""
echo "Verify with: ./scripts/verify_deployment.sh"
