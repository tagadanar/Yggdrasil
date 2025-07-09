#!/bin/bash

# Script to run individual functional tests with clean output
# Usage: ./test-individual.sh <test-file-pattern>

set -e

TEST_PATTERN=${1:-"diagnostic-quick"}

echo "🎯 Running individual test: $TEST_PATTERN"

# Kill any existing processes
killall -9 node 2>/dev/null || true
sleep 2

# Set test environment variables
export LOG_LEVEL=warn
export AUTH_SERVICE_URL=http://localhost:3101
export USER_SERVICE_URL=http://localhost:3102
export COURSE_SERVICE_URL=http://localhost:3103
export PLANNING_SERVICE_URL=http://localhost:3104
export NEWS_SERVICE_URL=http://localhost:3105
export STATISTICS_SERVICE_URL=http://localhost:3106
export NOTIFICATION_SERVICE_URL=http://localhost:3107

# Run the specific test with limited output
timeout 120s jest \
  --testPathPattern="$TEST_PATTERN" \
  --runInBand \
  --verbose \
  --reporters=default \
  --testTimeout=30000 \
  --maxWorkers=1

echo "✅ Test completed"