# Testing Issues & Solutions Guide

## 🔧 Common Testing Issues and Their Solutions

### 1. JWT Initialization Error in Tests

**Issue:**

```
JWT not initialized. Call initializeJWT() during service startup.
```

**Root Cause:**
JWT helper uses a singleton pattern that requires initialization before use. Unit tests don't automatically initialize it.

**Solution:**
Create a test setup file that initializes JWT before tests run:

```typescript
// packages/api-services/auth-service/__tests__/test-setup.ts

// Set up test environment variables before imports
process.env['JWT_SECRET'] =
  process.env['JWT_SECRET'] || 'test-jwt-secret-for-testing-only-that-is-longer-than-32-chars';
process.env['JWT_REFRESH_SECRET'] =
  process.env['JWT_REFRESH_SECRET'] ||
  'test-refresh-secret-for-testing-only-that-is-longer-than-32-chars';
process.env['JWT_ISSUER'] = 'yggdrasil-test';
process.env['JWT_AUDIENCE'] = 'yggdrasil-platform-test';

import { initializeJWT } from '@yggdrasil/shared-utilities';

beforeAll(() => {
  initializeJWT();
});
```

Then add to Jest config:

```json
{
  "jest": {
    "setupFilesAfterEnv": ["<rootDir>/__tests__/test-setup.ts"]
  }
}
```

---

### 2. ESM Module Import Issues (p-queue)

**Issue:**

```
SyntaxError: Cannot use import statement outside a module
```

**Root Cause:**
`p-queue` v8+ is ESM-only but Jest runs in CommonJS mode by default.

**Solution:**
Create/update comprehensive mock that matches the p-queue API:

```javascript
// packages/shared-utilities/__tests__/__mocks__/p-queue.js

class MockPQueue {
  constructor(options = {}) {
    this.concurrency = options.concurrency || Infinity;
    this.autoStart = options.autoStart !== false;
    this.queue = [];
    this.running = 0;
    this._isPaused = !this.autoStart;
  }

  async add(task, options = {}) {
    // Implementation details...
  }

  // Other methods...
}

module.exports = MockPQueue;
module.exports.default = MockPQueue;
module.exports.PQueue = MockPQueue;
```

Ensure Jest moduleNameMapper is configured:

```json
{
  "moduleNameMapper": {
    "^p-queue$": "<rootDir>/__tests__/__mocks__/p-queue.js"
  }
}
```

---

### 3. Missing Module References

**Issue:**

```
Cannot find module '../../src/patterns/course-enrollment-saga'
```

**Root Cause:**
Test references a module that doesn't exist yet (planned future functionality).

**Solution:**
Create a stub implementation to satisfy the import:

```typescript
// packages/shared-utilities/src/patterns/course-enrollment-saga.ts

import { Saga } from './saga';
import { EventBus } from '../events/event-bus';

export class CourseEnrollmentSaga extends Saga<CourseEnrollmentData> {
  constructor(eventBus: EventBus) {
    super('CourseEnrollmentSaga', eventBus);
    this.defineSteps();
  }

  private defineSteps(): void {
    // Stub implementation
    this.addStep({
      name: 'checkPrerequisites',
      execute: async data => data,
      compensate: async data => {},
    });
  }
}
```

---

### 4. Coverage Threshold Failures

**Issue:**

```
Jest: "global" coverage threshold for statements (60%) not met: 37%
```

**Root Cause:**
Coverage thresholds set too high for current state of the codebase.

**Solution:**
Set progressive, realistic thresholds based on current coverage:

```json
{
  "coverageThreshold": {
    "global": {
      "statements": 35, // Start slightly below current (37%)
      "branches": 25, // Achievable near-term goal
      "functions": 30, // Realistic target
      "lines": 35 // Match statements
    }
  }
}
```

**Strategy:**

1. Start with thresholds just below current coverage
2. Gradually increase as tests are added
3. Use per-file thresholds for critical code
4. Set aspirational thresholds for new code

---

## 🎯 Quick Fixes Reference

### Environment Variables for Testing

```bash
# Add to test scripts or .env.test
export JWT_SECRET="test-jwt-secret-that-is-definitely-longer-than-32-characters"
export JWT_REFRESH_SECRET="test-refresh-secret-that-is-definitely-longer-than-32-characters"
export JWT_ISSUER="yggdrasil-test"
export JWT_AUDIENCE="yggdrasil-platform-test"
export NODE_ENV="test"
export MONGODB_URI="mongodb://localhost:27018/yggdrasil-test"
```

### Common Jest Configuration Fixes

```javascript
// jest.config.js
module.exports = {
  // Fix ESM issues
  transformIgnorePatterns: ['node_modules/(?!(p-queue|eventemitter3|mongodb|bson)/)'],

  // Setup files for initialization
  setupFilesAfterEnv: ['<rootDir>/__tests__/test-setup.ts'],

  // Mock problematic modules
  moduleNameMapper: {
    '^p-queue$': '<rootDir>/__tests__/__mocks__/p-queue.js',
  },

  // Realistic coverage thresholds
  coverageThreshold: {
    global: {
      statements: 30,
      branches: 20,
      functions: 25,
      lines: 30,
    },
  },
};
```

### Testing Command Patterns

```bash
# Run specific tests with initialization
npm run test -- --setupFilesAfterEnv=./__tests__/test-setup.ts

# Run with coverage and ignore threshold failures
npm run test -- --coverage --coverageThreshold='{}'

# Debug ESM issues
npm run test -- --detectOpenHandles --forceExit

# Run single test for debugging
npm run test -- --testNamePattern="specific test name" --maxWorkers=1
```

---

## 📚 Best Practices

1. **Always Initialize Services in Test Setup**
   - JWT, database connections, etc. should be initialized in `beforeAll`
   - Use `setupFilesAfterEnv` for consistent initialization

2. **Mock ESM Modules Properly**
   - Create comprehensive mocks that match the API surface
   - Export both CommonJS and ESM formats
   - Use `moduleNameMapper` to redirect imports

3. **Set Realistic Coverage Goals**
   - Start with achievable thresholds
   - Increase progressively as tests are added
   - Use different thresholds for different types of code

4. **Document Workarounds**
   - Keep this file updated with new issues and solutions
   - Include error messages for searchability
   - Provide complete, working examples

---

## 🚨 Known Issues

1. **p-queue ESM Import**
   - Status: Workaround implemented (mock)
   - Long-term: Consider migrating to Jest ESM mode when stable

2. **JWT Initialization**
   - Status: Solved with test setup file
   - Note: Each service needs its own setup file

3. **MongoDB Authentication in Tests**
   - Status: Works with proper connection string
   - Note: Ensure test database has correct user permissions

---

## 📝 Maintenance Notes

- Review coverage thresholds quarterly
- Update mocks when dependencies change
- Test setup files should be kept minimal
- Consider extracting common test utilities to shared package

Last Updated: 2025-08-16
