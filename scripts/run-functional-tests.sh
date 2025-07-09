#!/bin/bash

# 🧪 Yggdrasil Functional Tests Runner
# This script demonstrates automated functional testing with background services

echo "🌳 Yggdrasil Functional Test Runner"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if MongoDB is running
check_mongodb() {
    print_status "Checking MongoDB connection..."
    
    if command -v mongosh &> /dev/null; then
        # MongoDB 5.0+ uses mongosh
        if mongosh --eval "db.runCommand('ping').ok" --quiet &> /dev/null; then
            print_success "MongoDB is running and accessible"
            return 0
        fi
    elif command -v mongo &> /dev/null; then
        # Older MongoDB versions use mongo
        if mongo --eval "db.runCommand('ping').ok" --quiet &> /dev/null; then
            print_success "MongoDB is running and accessible"
            return 0
        fi
    fi
    
    print_error "MongoDB is not running or not accessible"
    print_status "Please start MongoDB before running functional tests"
    print_status "Example: mongod --dbpath=/your/db/path"
    return 1
}

# Check if required ports are available
check_ports() {
    print_status "Checking if required ports are available..."
    
    local ports=(3001 3002 3003 3004 3005 3006)
    local blocked_ports=()
    
    for port in "${ports[@]}"; do
        if lsof -i :$port &> /dev/null; then
            blocked_ports+=($port)
        fi
    done
    
    if [ ${#blocked_ports[@]} -eq 0 ]; then
        print_success "All required ports (3001-3006) are available"
        return 0
    else
        print_warning "Some ports are in use: ${blocked_ports[*]}"
        print_status "Functional tests will attempt to use these ports anyway"
        print_status "If tests fail, consider stopping processes on these ports"
        return 0
    fi
}

# Install dependencies if needed
install_dependencies() {
    print_status "Checking dependencies..."
    
    cd /home/tagada/Desktop/Yggdrasil/packages/functional-tests
    
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
        if [ $? -eq 0 ]; then
            print_success "Dependencies installed successfully"
        else
            print_error "Failed to install dependencies"
            return 1
        fi
    else
        print_success "Dependencies already installed"
    fi
    
    return 0
}

# Run the functional tests
run_tests() {
    print_status "Starting functional tests with automated service management..."
    echo ""
    echo "🚀 The following will happen automatically:"
    echo "   1. Start all microservices in background"
    echo "   2. Wait for services to be healthy"
    echo "   3. Run comprehensive functional tests"
    echo "   4. Stop all services and clean up"
    echo ""
    
    cd /home/tagada/Desktop/Yggdrasil/packages/functional-tests
    
    # Run the tests
    npm run test:functional
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        print_success "All functional tests passed! 🎉"
        echo ""
        echo "📊 Test Results Summary:"
        echo "   ✅ Services started automatically"
        echo "   ✅ All API endpoints tested"
        echo "   ✅ Cross-service communication verified"
        echo "   ✅ Authentication workflows validated"
        echo "   ✅ Role-based access control tested"
        echo "   ✅ Services stopped and cleaned up"
        echo ""
        print_success "Yggdrasil platform is ready for deployment!"
    else
        print_error "Some functional tests failed"
        echo ""
        echo "🔍 Troubleshooting Tips:"
        echo "   1. Check MongoDB is running: mongod --dbpath=/your/db/path"
        echo "   2. Ensure ports 3001-3006 are available"
        echo "   3. Run with verbose output: npm test -- --verbose"
        echo "   4. Check service logs in the test output"
        echo ""
        print_status "For detailed debugging, run: npm run test:functional -- --verbose"
    fi
    
    return $exit_code
}

# Run alternative test types
run_alternative_tests() {
    echo ""
    print_status "Available alternative test commands:"
    echo ""
    echo "🧪 Test Categories:"
    echo "   npm run test:auth          # Authentication workflow tests"
    echo "   npm run test:workflow      # Complete user workflow tests"
    echo "   npm run test:functional    # All functional tests"
    echo ""
    echo "🔧 Development Commands:"
    echo "   npm run test:watch         # Watch mode for development"
    echo "   npm run test:coverage      # Tests with coverage report"
    echo "   npm test -- --verbose      # Detailed test output"
    echo ""
    echo "🎯 Specific Test Examples:"
    echo "   npm test -- --testNamePattern=\"should register user\""
    echo "   npm test -- --testPathPattern=auth-workflow"
    echo "   npm test -- --testPathPattern=complete-user-workflow"
    echo ""
}

# Main execution
main() {
    echo "Starting pre-flight checks..."
    echo ""
    
    # Pre-flight checks
    if ! check_mongodb; then
        exit 1
    fi
    
    check_ports
    
    if ! install_dependencies; then
        exit 1
    fi
    
    echo ""
    print_status "All pre-flight checks passed! Ready to run functional tests."
    echo ""
    
    # Run the main tests
    run_tests
    local test_result=$?
    
    # Show alternative options
    run_alternative_tests
    
    exit $test_result
}

# Execute main function
main "$@"