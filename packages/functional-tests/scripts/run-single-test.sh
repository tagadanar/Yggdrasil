#!/bin/bash

# Single Test Runner with Timeout Protection
# Usage: ./run-single-test.sh <test_pattern> [timeout_seconds]

set -e

TEST_PATTERN="$1"
TIMEOUT="${2:-180}"  # Default 3 minutes

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Running single test: $TEST_PATTERN${NC}"
echo -e "${YELLOW}⏱️  Timeout: ${TIMEOUT}s${NC}"
echo ""

# Function to cleanup background processes
cleanup() {
    local exit_code=$?
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    
    # Kill any remaining Jest processes
    pkill -f "jest.*functional" 2>/dev/null || true
    
    # Clean up any service processes
    pkill -f "node.*src/index.js" 2>/dev/null || true
    
    # Wait a moment for cleanup
    sleep 2
    
    exit $exit_code
}

# Set up cleanup trap
trap cleanup EXIT INT TERM

# Run the test with timeout
if timeout "$TIMEOUT" npm run test:functional:clean -- --testNamePattern="$TEST_PATTERN" --passWithNoTests 2>&1; then
    echo -e "${GREEN}✅ Test passed: $TEST_PATTERN${NC}"
    exit 0
else
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
        echo -e "${RED}⏰ Test timed out after ${TIMEOUT}s: $TEST_PATTERN${NC}"
        exit 124
    else
        echo -e "${RED}❌ Test failed: $TEST_PATTERN${NC}"
        exit $EXIT_CODE
    fi
fi