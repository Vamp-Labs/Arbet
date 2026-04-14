#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Arbet Devnet Deployment Script                 ║${NC}"
echo -e "${BLUE}║         Deploy to Solana Devnet                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"

# Check prerequisites
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose is not installed${NC}"
    exit 1
fi

if ! command -v solana &> /dev/null; then
    echo -e "${RED}✗ Solana CLI is not installed${NC}"
    echo -e "${YELLOW}Install from: https://docs.solana.com/cli/install-solana-cli-tools${NC}"
    exit 1
fi

if ! command -v anchor &> /dev/null; then
    echo -e "${RED}✗ Anchor is not installed${NC}"
    echo -e "${YELLOW}Install from: https://www.anchor-lang.com/docs/installation${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites checked${NC}"

# Setup Solana CLI for Devnet
echo -e "\n${YELLOW}Step 2: Configuring Solana CLI for Devnet...${NC}"
solana config set --url devnet
solana config set --commitment confirmed
echo -e "${GREEN}✓ Solana CLI configured for Devnet${NC}"

# Create .env.devnet if it doesn't exist
echo -e "\n${YELLOW}Step 3: Setting up environment...${NC}"
if [ ! -f ".env.devnet" ]; then
    echo -e "${RED}✗ .env.devnet not found${NC}"
    exit 1
fi

# Verify Solana wallet
echo -e "\n${YELLOW}Step 4: Checking Solana wallet...${NC}"
WALLET=$(solana address)
echo -e "${GREEN}✓ Wallet: $WALLET${NC}"

# Request airdrop for gas fees
echo -e "\n${YELLOW}Step 5: Requesting airdrop for transaction fees...${NC}"
solana airdrop 2 $WALLET --url devnet || echo -e "${YELLOW}Note: Airdrop may already be claimed${NC}"

# Build smart contracts
echo -e "\n${YELLOW}Step 6: Building smart contracts...${NC}"
cd contracts
anchor build
if [ -f "target/debug/arbet.so" ]; then
    echo -e "${GREEN}✓ Smart contract built successfully${NC}"
else
    echo -e "${RED}✗ Smart contract build failed${NC}"
    exit 1
fi
cd ..

# Deploy smart contracts
echo -e "\n${YELLOW}Step 7: Deploying smart contracts to Devnet...${NC}"
cd contracts
PROGRAM_ID=$(anchor deploy --provider.cluster devnet 2>&1 | grep "Program Id:" | awk '{print $3}')
if [ -n "$PROGRAM_ID" ]; then
    echo -e "${GREEN}✓ Smart contract deployed${NC}"
    echo -e "${BLUE}Program ID: $PROGRAM_ID${NC}"

    # Update .env.devnet with program ID
    sed -i "s/PROGRAM_ID=.*/PROGRAM_ID=$PROGRAM_ID/" ../.env.devnet
else
    echo -e "${RED}✗ Smart contract deployment failed${NC}"
    exit 1
fi
cd ..

# Build and start Docker services
echo -e "\n${YELLOW}Step 8: Building Docker images...${NC}"
docker-compose -f docker-compose.yml build

echo -e "\n${YELLOW}Step 9: Starting services...${NC}"
docker-compose -f docker-compose.yml up -d

echo -e "\n${YELLOW}Step 10: Waiting for services to be healthy...${NC}"
sleep 10

# Run health checks
echo -e "\n${YELLOW}Step 11: Running health checks...${NC}"
bash scripts/health-check.sh

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         ✓ Devnet Deployment Complete!                  ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"

    echo -e "\n${BLUE}Deployment Summary:${NC}"
    echo -e "  ${BLUE}Program ID:${NC}    $PROGRAM_ID"
    echo -e "  ${BLUE}Wallet:${NC}        $WALLET"
    echo -e "  ${BLUE}Frontend:${NC}      http://localhost:3000"
    echo -e "  ${BLUE}Backend API:${NC}   http://localhost:8000"
    echo -e "  ${BLUE}Network:${NC}       Devnet"

    echo -e "\n${BLUE}Next Steps:${NC}"
    echo -e "  1. Visit http://localhost:3000 to access the dashboard"
    echo -e "  2. Connect your Phantom wallet (set to Devnet)"
    echo -e "  3. Create a vault and deposit SOL"
    echo -e "  4. Monitor agent cycles and trades"

    echo -e "\n${GREEN}Deployment successful! 🚀${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Health checks failed${NC}"
    echo -e "${YELLOW}Check logs: docker-compose logs${NC}"
    exit 1
fi
