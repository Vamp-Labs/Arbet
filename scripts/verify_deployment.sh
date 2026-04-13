#!/bin/bash
# Solana devnet deployment verification script

set -e

echo "🔍 Verifying Arbet program deployment..."

# Check if solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Install: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

# Check network
NETWORK=$(solana config get | grep "RPC URL" | awk '{print $NF}')
echo "📡 Connected to: $NETWORK"

if [[ ! "$NETWORK" == *"devnet"* ]]; then
    echo "⚠️  Not on devnet. Switch with: solana config set --url https://api.devnet.solana.com"
    exit 1
fi

# Get program ID from Anchor.toml
PROGRAM_ID=$(grep "arbet =" Anchor.toml | grep -oP '"\K[^"]*' | head -1)

if [ -z "$PROGRAM_ID" ] || [ "$PROGRAM_ID" = "YOUR_PROGRAM_ID_HERE" ]; then
    echo "❌ Program ID not set in Anchor.toml"
    exit 1
fi

echo "📦 Program ID: $PROGRAM_ID"

# Verify program exists on-chain
echo "🔎 Verifying program on devnet..."
if solana program show "$PROGRAM_ID" &> /dev/null; then
    echo "✅ Program deployed successfully!"
    solana program show "$PROGRAM_ID"
else
    echo "❌ Program not found on-chain"
    echo "Deploy with: anchor deploy --provider.cluster devnet"
    exit 1
fi

# Check RPC account balance (requires fee for devnet)
echo ""
echo "💰 Checking account balance..."
BALANCE=$(solana balance | awk '{print $1}')
echo "Account balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 0.5" | bc -l) )); then
    echo "⚠️  Low balance. Request airdrop: solana airdrop 2 --url devnet"
fi

echo ""
echo "✅ All checks passed! Arbet program is ready on devnet."
