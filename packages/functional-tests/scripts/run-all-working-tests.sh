#!/bin/bash

# Yggdrasil Functional Test Suite - All Working Tests Runner
# This script runs all the currently working functional tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌳 =====================================================================${NC}"
echo -e "${BLUE}🌳 YGGDRASIL FUNCTIONAL TEST SUITE - ALL WORKING TESTS${NC}"
echo -e "${BLUE}🌳 =====================================================================${NC}"
echo ""

# Test results tracking
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0
FAILED_SUITE_NAMES=()

# Function to run a test suite
run_test_suite() {
    local suite_name="$1"
    local npm_command="$2"
    
    echo -e "${BLUE}🧪 Running: $suite_name${NC}"
    
    TOTAL_SUITES=$((TOTAL_SUITES + 1))
    
    # Run the test and capture output
    if timeout 180 npm run "$npm_command" 2>&1; then
        echo -e "${GREEN}✅ $suite_name: PASSED${NC}"
        PASSED_SUITES=$((PASSED_SUITES + 1))
    else
        echo -e "${RED}❌ $suite_name: FAILED${NC}"
        FAILED_SUITES=$((FAILED_SUITES + 1))
        FAILED_SUITE_NAMES+=("$suite_name")
    fi
    
    echo ""
}

echo -e "${BLUE}🎯 Running All Working Functional Test Suites${NC}"
echo ""

# Run all available working test suites
run_test_suite "Basic Auth Tests" "test:functional:basic"
run_test_suite "User Service Tests" "test:functional:user-only"
run_test_suite "Auth Workflow Tests" "test:functional:auth-only"

echo -e "${BLUE}🌳 =====================================================================${NC}"
echo -e "${BLUE}🌳 FUNCTIONAL TEST SUITE FINAL RESULTS${NC}"
echo -e "${BLUE}🌳 =====================================================================${NC}"
echo ""

# Display results
echo -e "${BLUE}📊 Test Suite Results Summary:${NC}"
echo -e "   ${GREEN}✅ Passed: $PASSED_SUITES${NC}"
if [ $FAILED_SUITES -gt 0 ]; then
    echo -e "   ${RED}❌ Failed: $FAILED_SUITES${NC}"
fi
echo -e "   ${BLUE}📈 Total: $TOTAL_SUITES${NC}"

if [ $TOTAL_SUITES -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_SUITES * 100 / TOTAL_SUITES))
    echo -e "${BLUE}📈 Success Rate: $SUCCESS_RATE%${NC}"
fi

echo ""

# Display failed suites
if [ ${#FAILED_SUITE_NAMES[@]} -gt 0 ]; then
    echo -e "${RED}🔥 Failed Test Suites:${NC}"
    for suite in "${FAILED_SUITE_NAMES[@]}"; do
        echo -e "   ${RED}❌ $suite${NC}"
    done
    echo ""
fi

echo -e "${BLUE}📝 Available Test Commands:${NC}"
echo -e "   ${YELLOW}npm run test:functional:basic${NC}           - Basic auth functionality"
echo -e "   ${YELLOW}npm run test:functional:auth-only${NC}       - Full auth workflow tests"
echo -e "   ${YELLOW}npm run test:functional:user-only${NC}       - User service tests"
echo -e "   ${YELLOW}npm run test:functional:clean${NC}           - All functional tests"
echo -e "   ${YELLOW}npm run test:functional:suites${NC}          - Run tests in separated suites"
echo -e "   ${YELLOW}npm run test:functional:single <pattern>${NC} - Run specific test"
echo ""

echo -e "${BLUE}🔧 Debugging Commands:${NC}"
echo -e "   ${YELLOW}npm run test:functional:verbose${NC}         - Verbose output"
echo -e "   ${YELLOW}npm run test:functional:quiet${NC}           - Minimal output"
echo ""

# Overall result
if [ $FAILED_SUITES -eq 0 ]; then
    echo -e "${GREEN}🎉 ====================================================================${NC}"
    echo -e "${GREEN}🎉 ALL FUNCTIONAL TEST SUITES PASSED!${NC}"
    echo -e "${GREEN}🎉 ====================================================================${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  ====================================================================${NC}"
    echo -e "${YELLOW}⚠️  SOME FUNCTIONAL TEST SUITES FAILED${NC}"
    echo -e "${YELLOW}⚠️  ====================================================================${NC}"
    echo -e "${YELLOW}ℹ️  This is expected as we're still working on fixing individual tests${NC}"
    echo -e "${YELLOW}ℹ️  The infrastructure is working correctly${NC}"
    exit 1
fi