#!/bin/bash

# Script to run comprehensive functional tests and analyze failures
# Optimized for identifying specific issues to fix

set -e

echo "🎯 Running comprehensive test analysis..."

# Clean up any existing processes
killall -9 node 2>/dev/null || true
sleep 2

# Set environment variables for functional test ports
export LOG_LEVEL=warn
export AUTH_SERVICE_URL=http://localhost:3101
export USER_SERVICE_URL=http://localhost:3102
export COURSE_SERVICE_URL=http://localhost:3103
export PLANNING_SERVICE_URL=http://localhost:3104
export NEWS_SERVICE_URL=http://localhost:3105
export STATISTICS_SERVICE_URL=http://localhost:3106
export NOTIFICATION_SERVICE_URL=http://localhost:3107

# Run comprehensive test with timeout and failure analysis
timeout 300s npm run test:functional:clean 2>&1 | tee test-analysis.log

echo "✅ Test analysis completed - results saved to test-analysis.log"