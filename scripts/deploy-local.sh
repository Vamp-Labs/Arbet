#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Arbet Local Deployment Script                  ║${NC}"
echo -e "${BLUE}║         One-Command Setup for Development               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Checking system prerequisites...${NC}"
docker --version
docker-compose --version

echo -e "\n${YELLOW}Step 2: Creating .env.local if it doesn't exist...${NC}"
if [ ! -f ".env.local" ]; then
    echo -e "${GREEN}Creating .env.local from .env.example${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo -e "${GREEN}✓ Created .env.local${NC}"
    else
        echo -e "${RED}✗ .env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env.local already exists${NC}"
fi

echo -e "\n${YELLOW}Step 3: Pulling latest Docker images...${NC}"
docker-compose pull

echo -e "\n${YELLOW}Step 4: Building Docker images...${NC}"
docker-compose build

echo -e "\n${YELLOW}Step 5: Starting all services...${NC}"
docker-compose up -d

echo -e "\n${YELLOW}Step 6: Waiting for services to become healthy...${NC}"
sleep 5

# Function to check service health
check_service() {
    local service=$1
    local max_attempts=30
    local attempt=0

    echo -n "Checking $service... "
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose exec -T $service /bin/true &> /dev/null; then
            echo -e "${GREEN}✓${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    echo -e "${RED}✗${NC}"
    return 1
}

# Check all services
services=("postgres" "redis" "backend" "frontend")
failed=0

for service in "${services[@]}"; do
    if ! check_service $service; then
        failed=1
    fi
done

echo -e "\n${YELLOW}Step 7: Running health checks...${NC}"
bash scripts/health-check.sh

if [ $failed -eq 0 ]; then
    echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         ✓ All Services Running Successfully!            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"

    echo -e "\n${BLUE}Available Services:${NC}"
    echo -e "  ${BLUE}Frontend:${NC}  http://localhost:3000"
    echo -e "  ${BLUE}Backend:${NC}   http://localhost:8000"
    echo -e "  ${BLUE}Adminer:${NC}   http://localhost:8080 (Database UI)"
    echo -e "  ${BLUE}MailHog:${NC}   http://localhost:8025 (Email Testing)"

    echo -e "\n${BLUE}Database Credentials:${NC}"
    echo -e "  ${BLUE}Host:${NC}     localhost"
    echo -e "  ${BLUE}Port:${NC}     5432"
    echo -e "  ${BLUE}User:${NC}     arbet"
    echo -e "  ${BLUE}Password:${NC} arbet_dev_password"
    echo -e "  ${BLUE}Database:${NC} arbet_local"

    echo -e "\n${BLUE}Useful Commands:${NC}"
    echo -e "  ${BLUE}View logs:${NC}        docker-compose logs -f"
    echo -e "  ${BLUE}View backend logs:${NC} docker-compose logs -f backend"
    echo -e "  ${BLUE}Stop services:${NC}     docker-compose down"
    echo -e "  ${BLUE}Reset database:${NC}    docker-compose down -v && ./scripts/deploy-local.sh"

    echo -e "\n${GREEN}Deployment completed successfully! 🚀${NC}"
    exit 0
else
    echo -e "\n${RED}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║         ✗ Some services failed to start                ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
    echo -e "\n${YELLOW}Troubleshooting:${NC}"
    echo -e "  1. Check logs: docker-compose logs"
    echo -e "  2. Check disk space: df -h"
    echo -e "  3. Check Docker: docker system df"
    echo -e "  4. Clean up: docker system prune -a"
    exit 1
fi
