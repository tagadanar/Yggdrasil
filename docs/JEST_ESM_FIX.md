# Jest ESM Module Resolution Fix

## Problem Description

When running Jest tests in services that import from `@yggdrasil/shared-utilities`, you may encounter this error:

```
SyntaxError: Cannot use import statement outside a module

/home/tagada/Desktop/Yggdrasil/node_modules/p-queue/dist/index.js:1
import { EventEmitter } from 'eventemitter3';
^^^^^^
```

## Root Cause

The `p-queue` package (version 8+) is ESM-only and uses ES modules (`import` statements). When Jest processes the dependency chain from your service tests → shared-utilities → connection-pool → p-queue, it encounters ESM syntax in a CommonJS context and fails.

## Solution: Jest Configuration Update

### Step 1: Create p-queue Mock

Create `__tests__/__mocks__/p-queue.js` in your service:

```javascript
// Mock implementation of p-queue for Jest testing
class MockPQueue {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 1;
    this.queue = [];
    this.running = 0;
  }

  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      // Process next task if any
      setImmediate(() => this.process());
    }
  }

  get size() {
    return this.queue.length;
  }

  get pending() {
    return this.running;
  }

  clear() {
    this.queue = [];
  }
}

module.exports = MockPQueue;
module.exports.default = MockPQueue;
```

### Step 2: Update Jest Configuration

Add these properties to your service's `package.json` Jest configuration:

```json
{
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "testMatch": ["**/__tests__/**/*.test.ts"],
    "collectCoverageFrom": ["src/**/*.ts", "!src/**/*.d.ts", "!src/index.ts"],
    "testTimeout": 10000,
    "moduleNameMapper": {
      "^p-queue$": "<rootDir>/__tests__/__mocks__/p-queue.js"
    },
    "transformIgnorePatterns": ["node_modules/(?!(p-queue|eventemitter3)/)"]
  }
}
```

**Key additions:**

- `moduleNameMapper`: Maps p-queue imports to your mock
- `transformIgnorePatterns`: Tells Jest to transform ESM packages instead of ignoring them

## Services That Need This Fix

Apply this fix to any service that:

1. Has Jest tests
2. Imports from `@yggdrasil/shared-utilities`
3. Gets the p-queue ESM error when running tests

## Verification

After applying the fix, you should be able to run:

```bash
npm run test:unit
npm run test:functional
```

The p-queue import error should be resolved, though other test issues may remain (database setup, JWT initialization, etc.).

## Implementation Status

✅ **auth-service** - Fixed  
🔍 **news-service** - Check if needed  
🔍 **planning-service** - Check if needed  
🔍 **user-service** - Check if needed  
🔍 **course-service** - Check if needed  
🔍 **statistics-service** - Check if needed

## Technical Details

### Why This Happens

1. Jest runs in CommonJS mode by default
2. p-queue v8+ is ESM-only (uses `import` statements)
3. Jest can't process ESM modules without special configuration
4. The import chain: service test → shared-utilities → connection-pool → p-queue fails

### Why This Solution Works

1. **Mock replacement**: `moduleNameMapper` replaces p-queue with a CommonJS mock
2. **Transform allowlist**: `transformIgnorePatterns` lets Jest process ESM packages
3. **Isolated testing**: Tests run with predictable queue behavior

### Alternative Solutions Considered

1. **ESM mode Jest**: More complex, affects entire test setup
2. **Downgrade p-queue**: Breaks shared-utilities functionality
3. **Remove p-queue**: Connection pool would lose queue functionality

## Future Improvements

Consider creating a shared Jest configuration that all services can inherit:

```json
// packages/shared-utilities/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^p-queue$': '<rootDir>/__tests__/__mocks__/p-queue.js'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(p-queue|eventemitter3)/)'
  ]
};
```

Then services can extend it:

```json
{
  "jest": {
    "extends": "@yggdrasil/shared-utilities/jest.config.js",
    "testMatch": ["**/__tests__/**/*.test.ts"]
  }
}
```
