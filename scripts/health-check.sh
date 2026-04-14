#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Health Check - Arbet Services                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"

failed=0

# Function to test endpoint
test_endpoint() {
    local url=$1
    local name=$2
    local timeout=5

    echo -n "Testing $name... "
    if timeout $timeout curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
}

# Function to test database
test_database() {
    local host=$1
    local port=$2
    local user=$3
    local password=$4
    local db=$5
    local name=$6

    echo -n "Testing $name... "
    if PGPASSWORD="$password" psql -h "$host" -p "$port" -U "$user" -d "$db" -c "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
}

# Function to test redis
test_redis() {
    local host=$1
    local port=$2
    local name=$3

    echo -n "Testing $name... "
    if redis-cli -h "$host" -p "$port" ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
}

# Test Backend API
echo -e "\n${BLUE}Backend Services:${NC}"
if ! test_endpoint "http://localhost:8000/health" "Backend API"; then
    failed=1
fi

# Test Frontend
echo -e "\n${BLUE}Frontend Services:${NC}"
if ! test_endpoint "http://localhost:3000/" "Frontend"; then
    failed=1
fi

# Test Database
echo -e "\n${BLUE}Database Services:${NC}"
if ! test_database "localhost" "5432" "arbet" "arbet_dev_password" "arbet_local" "PostgreSQL"; then
    failed=1
    echo -e "${YELLOW}Note: PostgreSQL client might not be installed locally${NC}"
fi

# Test Redis
echo -e "\n${BLUE}Cache Services:${NC}"
if ! test_redis "localhost" "6379" "Redis"; then
    failed=1
    echo -e "${YELLOW}Note: Redis client might not be installed locally${NC}"
fi

# Test Adminer
echo -e "\n${BLUE}Administrative Services:${NC}"
if ! test_endpoint "http://localhost:8080/" "Adminer"; then
    echo -e "${YELLOW}✓ Adminer (optional)${NC}"
fi

# Test MailHog
if ! test_endpoint "http://localhost:8025/" "MailHog"; then
    echo -e "${YELLOW}✓ MailHog (optional)${NC}"
fi

echo -e "\n${BLUE}Docker Container Status:${NC}"
docker-compose ps

if [ $failed -eq 0 ]; then
    echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         ✓ All Health Checks Passed!                    ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "\n${RED}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║         ✗ Some Health Checks Failed                    ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
