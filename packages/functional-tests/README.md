# Functional Tests for Yggdrasil Educational Platform

This package contains comprehensive functional tests for the Yggdrasil Educational Platform with **timeout-resistant infrastructure**, **improved error handling**, and **manageable test suites**.

## 🚀 Quick Start

### **🎯 Recommended Commands**

```bash
# Run all working functional tests (RECOMMENDED)
npm run test:functional:all-working

# Run individual test suites (timeout-resistant)
npm run test:functional:basic        # Basic auth functionality
npm run test:functional:auth-only    # Full auth workflow tests
npm run test:functional:user-only    # User service tests

# Run specific tests with timeout protection
npm run test:functional:single "should register a new user successfully"
```

## ✨ **Key Improvements**

### **🛡️ Timeout-Resistant Infrastructure**
- **Custom Reporter**: Clean, readable output that prevents timeouts
- **Manageable Test Suites**: Individual test commands for better control
- **Timeout Protection**: Built-in timeouts for all test execution
- **Better Error Handling**: Truncated error messages and proper cleanup

### **🔧 Enhanced Test Management**
- **Individual Suite Execution**: Run specific test categories separately
- **Service Health Checks**: Robust service startup verification
- **Unique Test Data**: Timestamp-based data to prevent conflicts
- **Comprehensive Scripts**: Multiple utility scripts for different needs

## 📋 Prerequisites

1. **MongoDB** running locally (default: `mongodb://localhost:27017`)
2. **Node.js** and **npm** installed
3. All service dependencies installed:
   ```bash
   cd /home/tagada/Desktop/Yggdrasil
   npm install
   ```

## 🧪 **Complete Command Reference**

### **🎯 Primary Commands (Recommended)**

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run test:functional:all-working` | ✅ **Run all working tests** | **Primary testing workflow** |
| `npm run test:functional:basic` | Basic auth functionality | Quick auth verification |
| `npm run test:functional:clean` | Clean output format | Individual test debugging |

### **🔧 Individual Test Suites**

| Command | Service | Description |
|---------|---------|-------------|
| `npm run test:functional:auth-only` | Auth Service | Authentication workflow tests |
| `npm run test:functional:user-only` | User Service | User management tests |
| `npm run test:functional:course-only` | Course Service | Course functionality tests |

### **🎯 Advanced Test Management**

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run test:functional:suites` | Run in separated manageable suites | Large test execution |
| `npm run test:functional:single <pattern>` | Run specific test with timeout protection | Individual test debugging |

### **🔍 Output Control**

| Command | Output Level | Use Case |
|---------|--------------|----------|
| `npm run test:functional:clean` | ✅ **Clean, readable** | **Daily development** |
| `npm run test:functional:verbose` | Full debug output | Troubleshooting issues |
| `npm run test:functional:quiet` | Minimal output | CI/CD pipelines |

## 🔧 **Service Management**

### **Automated Service Startup**
The tests automatically:
1. **Start required services** with test-specific ports
2. **Wait for health checks** to pass (up to 30 attempts)
3. **Run tests** against live services
4. **Clean up** all resources afterwards

### **Service Configuration (Functional Tests)**
| Service | Port | Health Endpoint | Status |
|---------|------|-----------------|--------|
| **Auth Service** | 3101 | `/health` | ✅ Working |
| **User Service** | 3102 | `/health` | ✅ Working |
| **Planning Service** | 3104 | `/health` | ✅ Working |
| **Course Service** | 3103 | `/health` | 🔧 In Progress |
| **News Service** | 3105 | `/health` | 🔧 In Progress |
| **Statistics Service** | 3106 | `/health` | 🔧 In Progress |

**Note**: Functional tests use ports 31XX to avoid conflicts with development services on 30XX.

## 📁 **Enhanced Test Structure**

```
src/
├── setup/
│   ├── globalSetup.ts              # Improved service startup
│   ├── globalTeardown.ts           # Enhanced cleanup
│   └── jest.setup.ts               # Per-test setup
├── utils/
│   ├── ApiTestHelper.ts            # Enhanced API testing helper
│   └── FunctionalTestReporter.js   # 🆕 Custom timeout-resistant reporter
├── tests/
│   ├── auth-basic.functional.test.ts           # 🆕 Basic auth tests
│   ├── auth-workflow.functional.test.ts        # Full auth workflow
│   ├── complete-user-workflow.functional.test.ts  # End-to-end tests
│   └── ... (other test files)
└── scripts/
    ├── run-functional-tests-suites.sh     # 🆕 Suite runner
    ├── run-single-test.sh                 # 🆕 Individual test runner
    └── run-all-working-tests.sh           # 🆕 Comprehensive test runner
```

## 🛠️ **ApiTestHelper Usage**

Enhanced with unique test data generation and better error handling:

```typescript
import { apiHelper } from '../utils/ApiTestHelper';

describe('My Functional Test', () => {
  beforeAll(async () => {
    // Wait for all services to be ready
    await apiHelper.waitForServices();
  });

  beforeEach(async () => {
    // Clear auth tokens between tests
    apiHelper.clearAuthTokens();
  });

  it('should register and login user', async () => {
    // Generate unique test data (timestamp-based)
    const userData = apiHelper.createTestData().user.student;
    
    // Register a new user
    const { user, tokens } = await apiHelper.registerUser(userData);
    
    // Make authenticated requests
    const response = await apiHelper.user('/profile', {
      method: 'GET'
    });
    
    expect(response.status).toBe(200);
    expect(response.data.data.email).toBe(userData.email);
  });
});
```

## 🚀 **Example Test Execution**

### **Clean Output Format (Recommended)**
```bash
$ npm run test:functional:basic

🌳 ====================================================================
🌳 YGGDRASIL FUNCTIONAL TEST SUITE  
🌳 ====================================================================

🧪 Running: auth-basic.functional.test.ts
✅ auth-basic.functional.test.ts: 3 passed (1.39s)

🌳 ====================================================================
🌳 FUNCTIONAL TEST RESULTS SUMMARY
🌳 ====================================================================

📊 Test Results:
   ✅ Passed: 3
   📈 Total: 3

📈 Success Rate: 100.0%
⏱️  Total Time: 1.39s

📁 Test Files:
   ✅ auth-basic.functional.test.ts: 3 passed

🎉 ====================================================================
🎉 ALL FUNCTIONAL TESTS PASSED!
🎉 ====================================================================
```

### **Comprehensive Test Runner**
```bash
$ npm run test:functional:all-working

🌳 ====================================================================
🌳 YGGDRASIL FUNCTIONAL TEST SUITE - ALL WORKING TESTS
🌳 ====================================================================

🧪 Running: Basic Auth Tests
✅ Basic Auth Tests: PASSED

🧪 Running: User Service Tests  
✅ User Service Tests: PASSED

🧪 Running: Auth Workflow Tests
✅ Auth Workflow Tests: PASSED

🌳 ====================================================================
🌳 FUNCTIONAL TEST SUITE FINAL RESULTS
🌳 ====================================================================

📊 Test Suite Results Summary:
   ✅ Passed: 3
   📈 Total: 3
   📈 Success Rate: 100%

🎉 ====================================================================
🎉 ALL FUNCTIONAL TEST SUITES PASSED!
🎉 ====================================================================
```

## 🔍 **Debugging & Troubleshooting**

### **Service Startup Issues**
```bash
# Check service health individually
curl http://localhost:3101/health  # Auth Service
curl http://localhost:3102/health  # User Service
curl http://localhost:3104/health  # Planning Service

# Verify no port conflicts
npm run verify-ports
```

### **Test Debugging**
```bash
# Run with full debug output
npm run test:functional:verbose

# Run specific test with timeout protection
npm run test:functional:single "User Registration"

# Run with service startup logs
LOG_LEVEL=debug npm run test:functional:clean
```

### **Common Issues & Solutions**

| Issue | Solution |
|-------|----------|
| **Services not starting** | Check MongoDB is running, verify ports are free |
| **Tests timing out** | Use `npm run test:functional:clean` for better output |
| **Random test failures** | Tests now use unique data, should be more stable |
| **Port conflicts** | Functional tests use 31XX ports, dev uses 30XX |

## 💡 **Best Practices**

### **✅ Recommended Workflow**
1. **Daily Testing**: Use `npm run test:functional:all-working`
2. **Individual Debugging**: Use `npm run test:functional:single <pattern>`
3. **Service Testing**: Use individual suite commands
4. **CI/CD**: Use `npm run test:functional:quiet`

### **🔧 Development Guidelines**
1. **Test Isolation**: Each test is independent with unique data
2. **Resource Cleanup**: Automatic cleanup after each test
3. **Realistic Scenarios**: Test real user workflows
4. **Error Handling**: Test both success and failure cases
5. **Performance**: Optimized for reasonable execution times

## 📈 **Infrastructure Benefits**

### **✅ Solved Problems**
- ❌ **Before**: Tests would timeout with overwhelming output
- ✅ **After**: Clean, readable output with timeout protection

- ❌ **Before**: Had to run all tests together, hard to debug
- ✅ **After**: Individual test suites, manageable execution

- ❌ **Before**: Service startup failures were hard to diagnose
- ✅ **After**: Robust health checks and clear error messages

- ❌ **Before**: Test data conflicts between runs
- ✅ **After**: Unique timestamp-based test data

### **🚀 Key Features**
✅ **Timeout-Resistant**: No more hanging tests  
✅ **Manageable Suites**: Run tests individually or together  
✅ **Clean Output**: Readable, formatted results  
✅ **Robust Service Management**: Automatic startup/cleanup  
✅ **Better Error Handling**: Clear, actionable error messages  
✅ **Developer Friendly**: Simple commands and intuitive workflow  

## 🎯 **Quick Start Guide**

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start MongoDB**:
   ```bash
   mongod --dbpath=/your/db/path
   ```

3. **Run working functional tests**:
   ```bash
   npm run test:functional:all-working
   ```

4. **Debug individual issues**:
   ```bash
   npm run test:functional:single "specific test name"
   ```

The enhanced functional test suite provides reliable, timeout-resistant testing with excellent debugging capabilities. No more hanging tests or overwhelming output!

---

**Happy Testing!** 🧪✨

*"Test with the reliability of Yggdrasil's eternal branches - structured, resilient, and ever-reliable."* 🌳