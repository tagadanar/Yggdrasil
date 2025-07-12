# 🧪 YGGDRASIL TEST COMMAND RATIONALIZATION DESIGN

## 🎯 **IMPROVED TEST COMMAND STRUCTURE**

### **🔧 INFRASTRUCTURE & ENVIRONMENT**
```bash
npm run test:infrastructure     # System setup and environment validation
npm run test:smoke             # Critical functionality smoke tests
```

### **🏗️ INTEGRATION TESTS** (Cross-service interactions)
```bash
npm run test:integration              # All integration tests
npm run test:integration:summary      # Integration tests with clean output
npm run test:integration:quiet        # Integration tests minimal output
npm run test:integration:auth         # Auth service integration tests
npm run test:integration:user         # User service integration tests  
npm run test:integration:course       # Course service integration tests
npm run test:integration:news         # News service integration tests
npm run test:integration:planning     # Planning service integration tests
npm run test:integration:statistics   # Statistics service integration tests
```

### **🚀 FUNCTIONAL TESTS** (End-to-end workflows)
```bash
npm run test:functional              # All functional tests
npm run test:functional:summary      # Functional tests with clean output
npm run test:functional:quiet        # Functional tests minimal output
npm run test:functional:auth         # Auth service functional tests
npm run test:functional:user         # User service functional tests
npm run test:functional:course       # Course service functional tests
npm run test:functional:news         # News service functional tests  
npm run test:functional:planning     # Planning service functional tests
npm run test:functional:statistics   # Statistics service functional tests
```

### **🎭 E2E TESTS** (Complete user journeys)
```bash
npm run test:e2e                     # All end-to-end user journey tests
npm run test:e2e:summary             # E2E tests with clean output
npm run test:e2e:quiet               # E2E tests minimal output
```

### **🔍 INDIVIDUAL TEST EXECUTION**
```bash
npm run test:single <pattern>              # Run specific test by pattern
npm run test:integration:single <pattern>  # Run specific integration test
npm run test:functional:single <pattern>   # Run specific functional test  
npm run test:e2e:single <pattern>         # Run specific e2e test
```

### **📊 COMPREHENSIVE TEST SUITES**
```bash
npm run test:all                     # Run ALL tests (integration + functional + e2e)
npm run test:all:summary             # All tests with clean output
npm run test:all:quiet               # All tests minimal output
npm run test:quick                   # Fast tests only (integration)
npm run test:critical               # Critical path tests only
```

### **🛠️ DEVELOPMENT & DEBUGGING**
```bash
npm run test:watch                  # Run tests in watch mode
npm run test:coverage              # Run tests with coverage report
npm run test:debug                 # Run diagnostic and debug tests
npm run test:verbose               # Verbose output for debugging
```

## 🎯 **KEY IMPROVEMENTS**

1. **Clear Separation**: Infrastructure → Integration → Functional → E2E
2. **Consistent Naming**: `test:type:service:variant` pattern
3. **Output Control**: `:summary` (clean), `:quiet` (minimal), default (standard)
4. **Granular Control**: Service-specific commands for targeted testing
5. **Practical Workflows**: Commands that match real development needs

## 📝 **ENVIRONMENT VARIABLE EXTRACTION**

Instead of long command lines, extract to configuration:
- `config/test-environments.js` - Environment configurations
- `.env.test` - Test-specific environment variables
- `scripts/` - Reusable test execution scripts

## 🚀 **USAGE EXAMPLES**

```bash
# Quick development feedback
npm run test:integration:auth:summary

# Complete service validation  
npm run test:functional:user

# Full system verification
npm run test:all:summary

# Debug specific failing test
npm run test:functional:single "should handle user registration"

# CI/CD pipeline
npm run test:all:quiet
```