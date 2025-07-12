#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🔐 Yggdrasil Authentication Test Runner${NC}"
echo -e "${BLUE}==============================================${NC}"

# Function to check if services are running
check_services() {
    echo -e "${YELLOW}⏳ Checking if services are running...${NC}"
    
    services=("3001" "3003" "3004" "3005" "3006")
    all_running=true
    
    for port in "${services[@]}"; do
        if ! curl -s "http://localhost:$port/health" > /dev/null; then
            echo -e "${RED}❌ Service on port $port is not running${NC}"
            all_running=false
        else
            echo -e "${GREEN}✅ Service on port $port is running${NC}"
        fi
    done
    
    if [ "$all_running" = false ]; then
        echo -e "${YELLOW}⚠️  Some services are not running. Please start them with:${NC}"
        echo -e "${CYAN}   npm run dev${NC}"
        return 1
    fi
    
    return 0
}

# Function to wait for services to be ready
wait_for_services() {
    echo -e "${YELLOW}⏳ Waiting for services to be fully ready...${NC}"
    sleep 5
}

# Function to create test user
create_test_user() {
    echo -e "${YELLOW}👤 Creating test admin user...${NC}"
    node create-test-user.js
}

# Function to run authentication tests
run_auth_tests() {
    echo -e "${YELLOW}🧪 Running authentication tests...${NC}"
    node test-auth-fix.js
}

# Main execution
echo -e "${BLUE}Starting authentication test sequence...${NC}\n"

# Check if services are running
if check_services; then
    wait_for_services
    create_test_user
    echo ""
    run_auth_tests
else
    echo -e "${RED}❌ Cannot run tests - services are not running${NC}"
    exit 1
fi

echo -e "\n${BLUE}Authentication test sequence completed${NC}"