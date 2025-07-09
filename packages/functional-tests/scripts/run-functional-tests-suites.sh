#!/bin/bash

# Yggdrasil Functional Test Suite Runner
# This script runs functional tests in smaller, manageable chunks to avoid timeouts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
FAILED_SUITES=()

echo -e "${BLUE}🌳 =====================================================================${NC}"
echo -e "${BLUE}🌳 YGGDRASIL FUNCTIONAL TEST SUITE RUNNER${NC}"
echo -e "${BLUE}🌳 =====================================================================${NC}"
echo ""

# Function to run a single test suite
run_test_suite() {
    local suite_name="$1"
    local test_pattern="$2"
    local description="$3"
    
    echo -e "${BLUE}🧪 Running: $description${NC}"
    echo -e "${YELLOW}   Pattern: $test_pattern${NC}"
    
    # Run the test and capture output
    if npm run test:functional:clean -- --testNamePattern="$test_pattern" --passWithNoTests 2>&1; then
        echo -e "${GREEN}✅ $suite_name: PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ $suite_name: FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_SUITES+=("$suite_name")
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo ""
}

# Function to run tests by file pattern
run_file_tests() {
    local suite_name="$1"
    local file_pattern="$2"
    local description="$3"
    
    echo -e "${BLUE}🧪 Running: $description${NC}"
    echo -e "${YELLOW}   Files: $file_pattern${NC}"
    
    # Run the test and capture output
    if npm run test:functional:clean -- --testPathPattern="$file_pattern" --passWithNoTests 2>&1; then
        echo -e "${GREEN}✅ $suite_name: PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ $suite_name: FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_SUITES+=("$suite_name")
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo ""
}

# Run individual test suites
echo -e "${BLUE}🎯 Running Individual Test Suites${NC}"
echo ""

# Authentication Tests
run_test_suite "Auth Registration" "User Registration Flow" "User registration and validation tests"
run_test_suite "Auth Login" "User Login Flow" "User login and authentication tests"
run_test_suite "Auth Cross-Service" "Cross-Service Authentication" "Cross-service authentication tests"
run_test_suite "Auth Token Management" "Token Management" "Token refresh and management tests"
run_test_suite "Auth Protected Routes" "Protected Routes" "Protected route access tests"

# User Service Tests
run_file_tests "User Service" "user.*functional" "User service functional tests"

# Course Service Tests
run_file_tests "Course Service" "course.*functional" "Course service functional tests"

# Planning Service Tests
run_file_tests "Planning Service" "planning.*functional" "Planning service functional tests"

# News Service Tests
run_file_tests "News Service" "news.*functional" "News service functional tests"

# Statistics Service Tests
run_file_tests "Statistics Service" "statistics.*functional" "Statistics service functional tests"

# Integration Tests
run_file_tests "Cross-Service Integration" "CrossServiceIntegration" "Cross-service integration tests"

# Workflow Tests (broken down)
run_test_suite "Complete Workflow" "Complete Educational Platform Workflow" "End-to-end educational workflow"
run_test_suite "RBAC Tests" "Role-Based Access Control" "Role-based access control tests"
run_test_suite "Error Handling" "Error Handling and Edge Cases" "Error handling and edge case tests"

echo -e "${BLUE}🌳 =====================================================================${NC}"
echo -e "${BLUE}🌳 FUNCTIONAL TEST SUITE RESULTS${NC}"
echo -e "${BLUE}🌳 =====================================================================${NC}"
echo ""

# Display results
echo -e "${BLUE}📊 Test Results Summary:${NC}"
echo -e "   ${GREEN}✅ Passed: $PASSED_TESTS${NC}"
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "   ${RED}❌ Failed: $FAILED_TESTS${NC}"
fi
echo -e "   ${BLUE}📈 Total: $TOTAL_TESTS${NC}"

if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "${BLUE}📈 Success Rate: $SUCCESS_RATE%${NC}"
fi

echo ""

# Display failed suites
if [ ${#FAILED_SUITES[@]} -gt 0 ]; then
    echo -e "${RED}🔥 Failed Test Suites:${NC}"
    for suite in "${FAILED_SUITES[@]}"; do
        echo -e "   ${RED}❌ $suite${NC}"
    done
    echo ""
fi

# Overall result
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 ====================================================================${NC}"
    echo -e "${GREEN}🎉 ALL FUNCTIONAL TEST SUITES PASSED!${NC}"
    echo -e "${GREEN}🎉 ====================================================================${NC}"
    exit 0
else
    echo -e "${RED}🔥 ====================================================================${NC}"
    echo -e "${RED}🔥 SOME FUNCTIONAL TEST SUITES FAILED${NC}"
    echo -e "${RED}🔥 ====================================================================${NC}"
    exit 1
fi