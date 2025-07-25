# CLAUDE.md - Yggdrasil Development Guide

> *"Code with the wisdom of the World Tree - structured, interconnected, and ever-growing"*

## 🌳 Project Overview

**Yggdrasil Educational Platform** - A monorepo educational system with microservices architecture.

### Tech Stack
- **Frontend**: Next.js 14 + TypeScript + React 18
- **Backend**: Express.js microservices + TypeScript  
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT + refresh tokens
- **Testing**: Playwright with single-worker testing for stability

### 🚨 **SYSTEM UPDATE: CLEAN TESTING ARCHITECTURE**
> **Simple and stable** - The testing system now uses a clean two-command architecture leveraging Playwright's proven service management. **Clean separation between overview and debugging.**
> 
> 📊 **Key Benefits**: Leverages existing infrastructure, foreground execution, immediate Ctrl+C response
> 
> 🎯 **Impact**: Clean test suite overview + targeted debugging, no background processes

### 🧹 **CLEAN ARCHITECTURE PRINCIPLES**

**🎯 IMPLEMENTED: Clean testing without worker isolation**
- ✅ **Direct dev database usage**: All tests use `mongodb://localhost:27018/yggdrasil-dev` 
- ✅ **No worker-specific collections**: Simplified database operations
- ✅ **Centralized cleanup**: `TestCleanup` utility tracks and cleans all test resources
- ✅ **Shared utilities**: All infrastructure moved to `@yggdrasil/shared-utilities`

**🔧 KEY COMPONENTS:**

#### **TestCleanup Utility**
```typescript
import { TestCleanup } from '@yggdrasil/shared-utilities';

// Track test resources for automatic cleanup
const cleanup = TestCleanup.getInstance('Test Name');
cleanup.trackDocument('users', userId);
cleanup.trackDocument('courses', courseId);

// Always cleanup in finally block
try {
  // Test logic here
} finally {
  await cleanup.cleanup(); // Removes all tracked resources
}
```

#### **Clean Database Architecture**
- **Single database**: `yggdrasil-dev` for all tests
- **No isolation prefixes**: Direct collection access (`users`, `courses`, etc.)
- **Immediate cleanup**: Resources removed after each test
- **Demo user management**: Centralized demo users with proper initialization

#### **Authentication Flow**
- **Working backend auth**: JWT tokens and user lookup fully functional
- **Frontend integration**: Demo login buttons trigger proper auth flow
- **Test environment navigation**: Manual navigation fallback for Playwright timing
- **Token management**: Proper cookie and localStorage handling

### ⛔ **CRITICAL RULE: NEVER MANUALLY START SERVICES DURING TESTING**

**🚨 ABSOLUTE PROHIBITION: DO NOT RUN `npm run dev` OR ANY SERVICE COMMANDS DURING TESTING**

**❌ FORBIDDEN COMMANDS DURING TESTING:**
- `npm run dev` - Starts background services that conflict with tests
- `npm run dev:health` - Not needed, tests handle service health
- Any manual service startup commands

**✅ WHY THIS RULE EXISTS:**
- Test suite automatically manages services via Playwright globalSetup/teardown
- Manual services create background Node.js processes that interfere with test isolation
- Causes port conflicts, strange behavior, and test failures
- Background processes persist and break subsequent test runs

**✅ CORRECT TESTING WORKFLOW:**
1. `npm run test:quiet` - Overview (auto-manages services)
2. `npm run test:single -- --grep "Test Name"` - Debug (auto-manages services)
3. Fix application code based on test failures
4. Re-run tests to verify fixes

**🔧 IF YOU ACCIDENTALLY STARTED SERVICES:**
```bash
# Kill any background services immediately
pkill -f "ts-node-dev|next|node.*service" || true
```

**The test infrastructure handles ALL service management automatically. Trust it.**

### Services & Ports
| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js application |
| Auth | 3001 | JWT authentication |
| User | 3002 | User management |
| News | 3003 | News & announcements |
| Course | 3004 | Course management |
| Planning | 3005 | Calendar & events |
| Statistics | 3006 | Analytics & reporting |

## 📋 **TABLE OF CONTENTS**

### 🔧 **SYSTEM ARCHITECTURE**
- [🔐 Authentication System](#-authentication-system---critical-working-state) - Stable auth patterns
- [⏰ Authentication Timing](#-authentication-timing---critical-for-all-tests) - **CRITICAL: Frontend auth flow timing**
- [🛠️ Shared Utilities](#️-shared-utilities---always-use-centralized-solutions) - Centralized solutions

### 🧪 **TESTING FRAMEWORK** 
- [🧪 Clean Testing Commands](#-clean-testing-commands) - Two-command architecture
- [🧪 Testing Philosophy](#-testing-philosophy---fix-the-app-not-the-test) - Core testing principles
- [🧪 Complete Test Suite](#-complete-test-suite-documentation) - All test suites
- [🏗️ Clean Testing Architecture](#️-clean-testing-architecture) - **NEW: Simplified testing with proper cleanup**

### 🚀 **DEVELOPMENT GUIDE**
- [🏗️ Development Principles](#️-development-principles) - Code patterns & best practices
- [🔧 Essential Commands](#-essential-commands) - Critical workflow commands
- [📁 Project Structure](#-project-structure) - Monorepo organization
- [💡 Debugging Tips](#-debugging-tips) - Troubleshooting guide

---

## 🔐 AUTHENTICATION SYSTEM - CRITICAL WORKING STATE

### 🚨 AUTHENTICATION IS NOW FULLY FUNCTIONAL - DO NOT BREAK!

**The authentication system was recently repaired after critical issues. Follow these rules EXACTLY:**

#### **🔑 Password Hashing - WORKING CORRECTLY**
- ✅ Test users are created with **bcrypt hashed passwords** in `database-isolation.ts`
- ✅ The `User.findByEmail()` method searches across **all worker collections** 
- ✅ Password comparison uses `bcrypt.compare()` properly
- ❌ **NEVER** modify password hashing logic in `database-isolation.ts:245-247`
- ❌ **NEVER** change the user creation flow in `createIsolatedUser()`

#### **🔍 User Lookup - WORKING CORRECTLY**  
- ✅ User lookup works with `User.findByEmail()` and `User.findById()`
- ✅ Test users are properly managed in isolated collections
- ❌ **NEVER** modify the user lookup logic in `UserSchema.statics.findByEmail`
- ❌ **NEVER** change the test user detection logic

#### **🗄️ Database Isolation - WORKING CORRECTLY**
- ✅ Auth service connects to proper test database  
- ✅ Test environment uses isolated database collections
- ✅ Users are properly saved for auth service visibility
- ❌ **NEVER** modify the database connection logic in auth service
- ❌ **NEVER** change the user creation patterns

#### **⚡ Authentication Flow Verification**
```bash
# This MUST always pass:
🔍 USER MODEL: Found user successfully
🔑 USER MODEL: Password comparison result: true
🎉 AUTHENTICATION SUCCESS - Complete flow working!
```

**If authentication tests start failing again, the issue is likely:**
1. Password hashing was accidentally disabled
2. User collection search was modified  
3. Database connections were changed
4. Transaction isolation was altered

## ⏰ AUTHENTICATION TIMING - CRITICAL FOR ALL TESTS

### 🚨 MANDATORY: UNDERSTAND FRONTEND AUTHENTICATION FLOW TIMING

**ALL authentication tests must account for the complex frontend authentication flow. Timing issues are the #1 cause of test failures!**

#### **🔄 Frontend Authentication Flow (3-5 seconds total):**
1. **API Call** (200ms) - Login request to auth service
2. **Response Processing** (100ms) - Frontend receives auth response
3. **Token Storage** (100ms) - `tokenStorage.setTokens()` sets cookies via js-cookie
4. **State Updates** (200ms) - React AuthProvider updates state  
5. **Navigation Trigger** (100ms) - `authFlowManager.handleLoginSuccess()` starts
6. **Navigation Execute** (1000ms) - Next.js router navigates to new page
7. **Page Load** (1000-2000ms) - New page loads and renders

**Total Time: 2700-3700ms minimum, up to 5000ms in test environment**

#### **✅ CORRECT AUTHENTICATION TIMING PATTERNS**

**USE THESE PATTERNS IN ALL AUTHENTICATION CODE:**

```typescript
// ✅ MANDATORY: Wait for navigation AND cookies together
await page.waitForFunction(
  () => {
    const notOnLoginPage = !window.location.pathname.includes('/auth/login');
    const hasCookies = document.cookie.includes('yggdrasil_access_token') || 
                      document.cookie.includes('yggdrasil_refresh_token');
    return notOnLoginPage && hasCookies;
  },
  { timeout: 45000 } // MANDATORY: Use 45s timeout for frontend auth flow
);

// ✅ MANDATORY: Additional wait for frontend state synchronization
await page.waitForTimeout(1000);
```

#### **❌ INCORRECT TIMING PATTERNS - NEVER USE THESE**

```typescript
// ❌ NEVER: Fixed timeouts without condition checking
await page.waitForTimeout(2000);
const isAuth = await verifyAuthState(); // Will fail randomly

// ❌ NEVER: Short timeouts that don't account for frontend flow
await page.waitForFunction(condition, { timeout: 5000 }); // Too short!

// ❌ NEVER: Checking auth state immediately after API success
const response = await authApi.login();
if (response.status === 200) {
  const isAuth = await verifyAuthState(); // Will fail - cookies not set yet!
}
```

#### **🔧 AUTHENTICATION HELPER USAGE**

**ALL tests must use the fixed authentication helpers:**

```typescript
// ✅ CORRECT: Use AuthTestHelper with fixed timing
import { AuthTestHelper } from '@yggdrasil/shared-utilities/testing';

const authHelper = new AuthTestHelper(page, { 
  debug: true,    // Enable debugging for timing issues
  timeout: 45000  // Use generous timeout
});

// ✅ CORRECT: Use CleanAuthHelper (already has good timing)
import { CleanAuthHelper } from '@yggdrasil/shared-utilities/testing';

const authHelper = new CleanAuthHelper(page);
```

#### **🚨 COMMON TIMING FAILURES AND SOLUTIONS**

**Error: "Authentication API succeeded but state verification failed"**
- **Cause:** Test checked auth state before frontend completed cookie setting
- **Solution:** Use `waitForFunction()` with cookie + navigation conditions

**Error: "page.goto: Timeout 30000ms exceeded"**
- **Cause:** Services not started or frontend not responding
- **Solution:** Check service health, use longer timeouts, ensure services are running

**Error: "TimeoutError: Waiting for selector timed out"**
- **Cause:** Page didn't load or render properly after authentication
- **Solution:** Wait for navigation completion, then wait for page elements

#### **🎯 DEBUGGING AUTHENTICATION TIMING ISSUES**

```typescript
// ✅ Add debugging to all authentication tests
const authHelper = new AuthTestHelper(page, { debug: true });

// ✅ Check current state when authentication fails
const currentState = await page.evaluate(() => ({
  url: window.location.href,
  pathname: window.location.pathname,
  cookies: document.cookie,
  hasYggdrasilCookies: document.cookie.includes('yggdrasil_')
}));
console.log('🔐 Current auth state:', JSON.stringify(currentState, null, 2));
```

#### **📋 AUTHENTICATION TIMING CHECKLIST**

Before writing any authentication test, ensure:
- [ ] Using AuthTestHelper or CleanAuthHelper (not custom auth logic)
- [ ] Using 45s timeouts for all authentication operations
- [ ] Waiting for BOTH navigation AND cookies before verification
- [ ] Adding 1s buffer after conditions are met
- [ ] Enabling debug mode for timing investigation
- [ ] Never using fixed `waitForTimeout()` without condition checking

#### **🔥 CRITICAL RULE: NEVER MODIFY AUTHENTICATION HELPERS**

**The authentication helpers have been carefully tuned for frontend timing. NEVER:**
- Reduce timeouts below 45s
- Remove cookie waiting logic  
- Skip navigation waiting
- Modify the verification sequence
- Add custom timing patterns

**If authentication tests fail, the issue is in the application flow, NOT the test timing!**

## 🛠️ SHARED UTILITIES - ALWAYS USE CENTRALIZED SOLUTIONS

### 🚨 CRITICAL PRINCIPLE: USE SHARED UTILITIES, NEVER IMPLEMENT LOCALLY

**BEFORE writing any utility, helper, or infrastructure code, CHECK if it exists in `@yggdrasil/shared-utilities` first!**

### 📦 Available Shared Utilities

#### **Authentication & JWT**
```typescript
import { SharedJWTHelper, AuthResult, LoginRequestType } from '@yggdrasil/shared-utilities';

// ✅ ALWAYS use SharedJWTHelper for JWT operations
const token = SharedJWTHelper.generateAccessToken(user);
const decoded = SharedJWTHelper.verifyAccessToken(token);
```

#### **API Responses**
```typescript
import { ResponseHelper } from '@yggdrasil/shared-utilities';

// ✅ ALWAYS use ResponseHelper for consistent API responses
return ResponseHelper.success(data, 'Operation successful');
return ResponseHelper.error('Validation failed', 400);
```

#### **Testing Infrastructure** ⭐ **NEW & CRITICAL**
```typescript
import { 
  startTestEnvironment, 
  getCurrentWorkerConfig, 
  WorkerConfigManager,
  ServiceManager,
  DatabaseIsolationManager
} from '@yggdrasil/shared-utilities';

// ✅ ALWAYS use centralized testing utilities
const testEnv = await startTestEnvironment(); // Auto-detects worker
const config = getCurrentWorkerConfig(); // Gets ports, database, etc.
const authPort = WorkerConfigManager.getServicePort('auth');
```

#### **Types & Validation**
```typescript
import { 
  UserType, 
  CourseType, 
  NewsType,
  loginSchema,
  courseSchema 
} from '@yggdrasil/shared-utilities';

// ✅ ALWAYS use shared types and validation schemas
const validatedData = loginSchema.parse(requestData);
```

### 🧪 CENTRALIZED TESTING UTILITIES

**CRITICAL: All test infrastructure is now centralized. NEVER implement worker detection, port calculation, database setup, or service management locally.**

#### **Quick Test Setup**
```typescript
import { startTestEnvironment } from '@yggdrasil/shared-utilities';

// ✅ One-line test environment setup
const testEnv = await startTestEnvironment();
console.log(testEnv.services.auth); // http://localhost:3001 (or worker-specific)
```

#### **Service Configuration**
```typescript
import { WorkerConfigManager } from '@yggdrasil/shared-utilities';

// ✅ Get worker-specific ports
const authPort = WorkerConfigManager.getServicePort('auth');
const frontendPort = WorkerConfigManager.getServicePort('frontend');

// ✅ Apply worker environment
WorkerConfigManager.applyWorkerEnvironment();
```

#### **Database Isolation**
```typescript
import { DatabaseIsolationManager } from '@yggdrasil/shared-utilities';

// ✅ Worker-specific database management
const dbManager = DatabaseIsolationManager.getCurrent();
await dbManager.initialize();
const testUser = await dbManager.createTestUser({
  email: 'test@example.com',
  password: 'hashedPassword'
});
```

#### **Service Management**
```typescript
import { ServiceManager } from '@yggdrasil/shared-utilities';

// ✅ Centralized service startup/shutdown
const serviceManager = new ServiceManager();
await serviceManager.startServices();
const isHealthy = await serviceManager.healthCheck();
await serviceManager.stopServices();
```

### ⚠️ ANTI-PATTERNS TO AVOID

**❌ NEVER DO THESE:**
```typescript
// ❌ DON'T implement local port calculation
const port = 3000 + workerId * 10;

// ❌ DON'T implement local worker detection
const workerId = process.env.PLAYWRIGHT_WORKER_ID;

// ❌ DON'T implement local database setup
const dbName = `test_db_${workerId}`;

// ❌ DON'T implement local service management
spawn('npm', ['run', 'dev'], { env: { PORT: port } });

// ❌ DON'T implement local JWT logic
const token = jwt.sign(payload, secret);

// ❌ DON'T implement local response formatting
res.json({ success: true, data: result });
```

**✅ INSTEAD USE SHARED UTILITIES:**
```typescript
// ✅ Use centralized configuration
import { getCurrentWorkerConfig, WorkerConfigManager } from '@yggdrasil/shared-utilities';

const config = getCurrentWorkerConfig();
const port = config.ports.auth;
const workerId = config.workerId;
const dbName = config.database.name;

// ✅ Use centralized service management
import { ServiceManager } from '@yggdrasil/shared-utilities';
const serviceManager = new ServiceManager();

// ✅ Use centralized JWT
import { SharedJWTHelper } from '@yggdrasil/shared-utilities';
const token = SharedJWTHelper.generateAccessToken(user);

// ✅ Use centralized responses
import { ResponseHelper } from '@yggdrasil/shared-utilities';
return ResponseHelper.success(result);
```

### 🎯 DEVELOPMENT WORKFLOW

1. **BEFORE coding**: Check `@yggdrasil/shared-utilities` for existing solutions
2. **IF missing**: Add to shared utilities first, then use it
3. **NEVER**: Implement locally what could be shared
4. **ALWAYS**: Import from `@yggdrasil/shared-utilities`

### 🔧 SERVICES MUST USE SHARED UTILITIES

All services MUST use shared utilities for:
- **Port calculation**: `WorkerConfigManager.getServicePort()`
- **Environment setup**: `WorkerConfigManager.applyWorkerEnvironment()`
- **JWT operations**: `SharedJWTHelper.*`
- **API responses**: `ResponseHelper.*`
- **Database connections**: Use centralized config from `getCurrentWorkerConfig()`

**Example service index.ts:**
```typescript
import { WorkerConfigManager, SharedJWTHelper } from '@yggdrasil/shared-utilities';

// ✅ Use shared utilities for configuration
const config = getCurrentWorkerConfig();
const PORT = process.env.PORT || config.ports.auth;

// ✅ Apply worker environment
WorkerConfigManager.applyWorkerEnvironment();
```

## 🧪 CLEAN TESTING COMMANDS

### 🎯 **TWO-COMMAND ARCHITECTURE**

**Simple, clean testing with clear separation of concerns:**

### **`npm run test:quiet` - System Overview**
- **Purpose**: Get complete test suite health overview
- **Output**: Clean pass/fail status for each test suite category
- **Usage**: Daily health checks, CI/CD, overall system status
- **Execution**: Foreground with immediate Ctrl+C response

### **`npm run test:single` - Targeted Debugging**  
- **Purpose**: Debug specific tests or test suites
- **Output**: Detailed test execution with full logs
- **Usage**: Development debugging, investigating failures
- **Execution**: `npm run test:single -- --grep "Suite Name"`

### 🔧 **CLEAN ARCHITECTURE BENEFITS**

**Leverages Playwright Infrastructure:**
- ✅ **Uses existing globalSetup/teardown** for service management
- ✅ **No custom service spawning** - relies on proven Playwright patterns
- ✅ **Foreground execution** - maintains terminal control
- ✅ **Immediate Ctrl+C response** - no background processes
- ✅ **JSON output parsing** for clean overview display

### 📊 **EXAMPLE OUTPUT**

**test:quiet Overview:**
```bash
🧪 Test Suite Overview
💡 Running all tests with service management via Playwright

🧹 Pre-cleaning environment...
🎭 Running complete test suite...

📊 Test Suite Results:
════════════════════════════════════════════════════════════════════════════════
1. Authentication Security        [CRITICAL] ✅ PASS (3/3)
2. User Management                [HIGH    ] ✅ PASS (9/9)  
3. Course Management              [HIGH    ] ❌ FAIL (6/7)
4. News Management                [MEDIUM  ] ✅ PASS (5/5)
5. Planning Management            [MEDIUM  ] ✅ PASS (5/5)
6. Platform Features              [MEDIUM  ] ✅ PASS (5/5)
7. Statistics Management          [MEDIUM  ] ✅ PASS (4/4)
8. System Integration             [HIGH    ] ✅ PASS (8/8)

📈 FINAL SUMMARY:
🎯 Test Suites: 7 passed, 1 failed, 8 total
🧪 Individual Tests: 40 passed, 1 failed, 41 total

💡 To debug, try: npm run test:single -- --grep "Course Management"
```

**test:single Debugging:**
```bash
npm run test:single -- --grep "Course Management"
# Shows detailed test execution with full logs for debugging
```

## 🧪 Testing Philosophy - FIX THE APP, NOT THE TEST

### 🚨 THE GOLDEN RULE
**When a test fails, the application has a bug. Fix the root cause in the application code, NEVER modify the test to pass.**

### 📋 Recommended Test Workflow

```bash
# 🎯 CLEAN TWO-COMMAND WORKFLOW:

# 1. GET SYSTEM OVERVIEW - Check overall health
npm run test:quiet

# 2. DEBUG SPECIFIC ISSUES - Target failing suites
npm run test:single -- --grep "Authentication Security"
npm run test:single -- --grep "User Management" 
npm run test:single -- --grep "Course Management"
npm run test:single -- --grep "News Management"
npm run test:single -- --grep "Planning Management"
npm run test:single -- --grep "Platform Features"
npm run test:single -- --grep "Statistics Management"
npm run test:single -- --grep "System Integration"

# 3. DEBUG SPECIFIC TESTS - Drill down to exact issues
npm run test:single -- --grep "specific test name"

# 4. USE BROWSER UI FOR COMPLEX DEBUGGING
npm run test:debug -- --grep "specific test name"

# 5. FIX - Modify application code (NOT test code)

# 6. VERIFY - Re-run overview to confirm fix
npm run test:quiet
```

### ⚡ Testing Best Practices

**✅ ALWAYS:**
- Start with `npm run test:quiet` for system overview
- Use `npm run test:single` for targeted debugging  
- Fix the root cause in app code (never modify tests)
- Wait for tests to complete naturally
- Read error messages carefully
- Check browser screenshots/traces on failure
- Use Ctrl+C to interrupt - it works immediately

**❌ NEVER:**
- Skip or disable failing tests
- Modify tests to make them pass
- Add arbitrary waits without understanding why
- Assume a test is "flaky" - find the real issue
- Manually start services with `npm run dev` during testing

### 🎯 Current Test Architecture
- **8 test suite categories** covering all user workflows
- **Single-worker execution** with complete stability
- **Automatic service management** via Playwright globalSetup/teardown
- **Clean two-command interface** for overview and debugging

## 🧪 Complete Test Suite Documentation

### 📋 Test Suite Overview
| Suite | Tests | Focus Area | Priority |
|-------|-------|------------|----------|
| Authentication Security | 3 | JWT, sessions, authorization | **CRITICAL** |
| User Management | 9 | CRUD operations, validation | **HIGH** |
| Course Management | 7 | Educational workflows | **HIGH** |
| News Management | 5 | Content management | **MEDIUM** |
| Planning Management | 5 | Calendar & events | **MEDIUM** |
| Platform Features | 5 | Cross-cutting concerns | **MEDIUM** |
| System Integration | 8 | End-to-end workflows | **HIGH** |

### 🔧 Test Suite Commands

#### **1. Authentication Security (3 tests)**
```bash
# Run all authentication tests
npm run test:single -- --grep "Authentication Security"

# Individual tests
npm run test:single -- --grep "AUTH-001: Complete JWT Security Lifecycle"
npm run test:single -- --grep "AUTH-002: Multi-Device Session Management"
npm run test:single -- --grep "AUTH-003: Role-Based Authorization Matrix"
```

#### **2. User Management (9 tests)**
```bash
# Run all user management tests
npm run test:single -- --grep "User Management"

# Individual tests
npm run test:single -- --grep "Should handle access control and navigation for all user roles"
npm run test:single -- --grep "Should display user interface with proper loading states"
npm run test:single -- --grep "Should handle complete user creation workflow"
npm run test:single -- --grep "Should handle complete user editing workflow"
npm run test:single -- --grep "Should handle complete user deletion workflow"
npm run test:single -- --grep "Should handle API integration and error scenarios"
npm run test:single -- --grep "Should handle search and filtering functionality"
npm run test:single -- --grep "USER-001: Complete User Lifecycle Management"
npm run test:single -- --grep "USER-002: Bulk User Operations"
```

#### **3. Course Management (7 tests)**
```bash
# Run all course management tests
npm run test:single -- --grep "Course Management"

# Individual tests
npm run test:single -- --grep "Role-based course access and permissions"
npm run test:single -- --grep "Course page basic functionality and navigation"
npm run test:single -- --grep "Student course page view and basic functionality"
npm run test:single -- --grep "Teacher course page view and basic functionality"
npm run test:single -- --grep "COURSE-001: Complete Course Creation"
npm run test:single -- --grep "COURSE-002: Exercise Submission"
npm run test:single -- --grep "COURSE-003: Quiz System"
```

#### **4. News Management (5 tests)**
```bash
# Run all news management tests
npm run test:single -- --grep "News Management"

# Individual tests
npm run test:single -- --grep "Role-based news access and permissions"
npm run test:single -- --grep "Complete article lifecycle"
npm run test:single -- --grep "News filtering and content discovery"
npm run test:single -- --grep "News page loading states and error handling"
npm run test:single -- --grep "Access denied message functionality"
```

#### **5. Planning Management (5 tests)**
```bash
# Run all planning management tests
npm run test:single -- --grep "Planning Management"

# Individual tests
npm run test:single -- --grep "Role-based calendar access and permissions"
npm run test:single -- --grep "Calendar view modes and navigation"
npm run test:single -- --grep "Event creation workflow for authorized users"
npm run test:single -- --grep "Planning page error handling and loading states"
npm run test:single -- --grep "Basic planning page functionality verification"
```

#### **6. Platform Features (5 tests)**
```bash
# Run all platform feature tests
npm run test:single -- --grep "Platform Features"

# Individual tests
npm run test:single -- --grep "Complete authentication system workflow"
npm run test:single -- --grep "Complete profile management workflow"
npm run test:single -- --grep "Complete statistics and analytics system"
npm run test:single -- --grep "System health and performance monitoring"
npm run test:single -- --grep "Platform error handling and edge cases"
```

#### **7. System Integration (8 tests)**
```bash
# Run all system integration tests
npm run test:single -- --grep "System Integration"

# Individual tests
npm run test:single -- --grep "Complete cross-service integration workflow"
npm run test:single -- --grep "System resilience under adverse conditions"
npm run test:single -- --grep "Security boundaries and session management"
npm run test:single -- --grep "System performance under load"
npm run test:single -- --grep "Data consistency across services"
npm run test:single -- --grep "Service health monitoring and diagnostics"
npm run test:single -- --grep "INTEGRATION-001: Complete Student Learning Journey"
npm run test:single -- --grep "INTEGRATION-002: Instructor Teaching Workflow"
```

### 🚨 Critical Test Execution Guidelines

#### **Recommended Execution Order:**
1. **Authentication Security** (Run first - blocks everything else if failing)
2. **User Management** (Core functionality - required for other tests)
3. **Course Management** (Primary educational features)
4. **News Management** (Content management features)
5. **Planning Management** (Calendar and scheduling)
6. **Platform Features** (Cross-cutting concerns)
7. **System Integration** (End-to-end workflows)

#### **Timeout Prevention Strategy:**
- **NEVER run `test:quiet`** - causes timeouts with 4 workers
- **Run one suite at a time** - prevents resource conflicts
- **Wait for completion** - don't interrupt running tests
- **Check screenshots** - on failure, examine visual evidence

#### **Debug Strategy:**
```bash
# For failing tests, use debug mode
npm run test:debug -- --grep "specific failing test"

# For detailed investigation
npm run test:single -- --grep "failing test" --reporter=list
```

## 🏗️ Development Principles

### 1. Type Safety First
- TypeScript everywhere, no `any` types
- Zod for runtime validation
- Shared types from `@yggdrasil/shared-utilities`

### 2. Shared Utilities Pattern
**ALWAYS use shared utilities instead of local solutions:**

#### Authentication & Authorization
- Use `SharedJWTHelper` for JWT operations
- Use `AuthMiddleware` for route protection:
  - `AuthMiddleware.verifyToken` - Fast token verification
  - `AuthMiddleware.verifyTokenWithUserLookup(userLookupFn)` - Token + database lookup
  - `AuthMiddleware.requireRole(['admin', 'staff'])` - Role-based access
  - `AuthMiddleware.adminOnly`, `staffOnly`, `teacherAndAbove` - Convenience methods
- Use auth validation schemas: `LoginRequestSchema`, `RegisterRequestSchema`

#### API Responses  
- Use `ResponseHelper` for consistent API responses
- Never create custom response formats

#### Validation
- Use Zod schemas from shared utilities
- Use `ValidationHelper.validate(schema, data)` for request validation

#### Types & Interfaces
- Import types from `@yggdrasil/shared-utilities`
- Never duplicate interface definitions

#### Testing Infrastructure
- Use centralized testing utilities: `@yggdrasil/shared-utilities/testing`
- Use `WorkerConfigManager`, `DatabaseIsolationManager`, `ResourcePoolManager`
- Never implement local test infrastructure

**Rule: Before implementing any logic, check if it exists in shared utilities first!**

### 3. Security by Design
- Environment variables for secrets
- bcrypt for passwords
- Input validation at boundaries
- Structured error responses

### 4. Minimal Dependencies
Before adding any dependency, ask:
- Can this be done with vanilla JS/TS?
- Is the library actively maintained?
- Does the benefit justify the bundle size?

### 5. Clean Code
- **DRY**: Extract repeated logic
- **KISS**: Simple solutions win
- **Comments**: Explain WHY, not WHAT

## 🔧 Essential Commands

### 🎯 **CLEAN COMMAND STRUCTURE**

**For Development:**
```bash
npm run dev          # Start all services for development
npm run dev:stop     # Stop all services
npm run dev:health   # Check service health
```

**For Testing:**
```bash
npm run test:quiet   # System overview - all test suites with clean output
npm run test:single  # Debug specific tests/suites with detailed output
npm run test:debug   # Debug with browser UI (headed mode)
```

**For Code Quality:**
```bash
npm run typecheck    # TypeScript validation
npm run clean        # Clean test artifacts and build files
```

### 🧪 **TESTING COMMANDS IN DETAIL**

**System Overview:**
```bash
npm run test:quiet
# - Runs ALL test suites automatically
# - Shows clean pass/fail status for each category
# - Uses Playwright's proven service management
# - Perfect for CI/CD and daily health checks
```

**Targeted Debugging:**
```bash
npm run test:single -- --grep "Authentication Security"
npm run test:single -- --grep "User Management"
npm run test:single -- --grep "Course Management"
npm run test:single -- --grep "News Management"
npm run test:single -- --grep "Planning Management"
npm run test:single -- --grep "Platform Features"
npm run test:single -- --grep "Statistics Management"
npm run test:single -- --grep "System Integration"

# Or debug specific test
npm run test:single -- --grep "specific test name"
```

**Browser Debugging:**
```bash
npm run test:debug -- --grep "specific test name"
# - Opens browser UI for visual debugging
# - Step through test execution
# - Inspect elements and network requests
```

## 📁 Project Structure

```
packages/
├── frontend/               # Next.js application
├── api-services/           # Express microservices
│   ├── auth-service/
│   ├── user-service/
│   ├── news-service/
│   ├── course-service/
│   ├── planning-service/
│   └── statistics-service/
├── database-schemas/       # Mongoose models
├── shared-utilities/       # Shared code & types
└── testing-utilities/      # Test infrastructure
    ├── tests/
    │   ├── functional/     # User workflow tests
    │   ├── integration/    # System integration
    │   └── helpers/        # Test utilities
    └── playwright.enhanced.config.ts
```

## 🚀 Quick Start

1. **Get system overview**: `npm run test:quiet`
2. **Debug failing suites**: `npm run test:single -- --grep "Suite Name"`
3. **Debug specific tests**: `npm run test:single -- --grep "test name"`
4. **Visual debugging**: `npm run test:debug -- --grep "test name"`
5. **Fix app code**: Never modify tests to pass
6. **Verify fix**: `npm run test:quiet`
7. **Development**: `npm run dev` to start services manually

## 💡 Debugging Tips

- **Timeout errors**: Service is slow, not broken - add proper waits
- **Element not found**: Check for dynamic loading, wait for elements
- **Auth failures**: Token expiry or race condition - check timing
- **Flaky tests**: There's always a root cause - investigate thoroughly

Remember: **Every test failure represents a real user-facing bug. Fix it properly.**

## 🏗️ CLEAN TESTING ARCHITECTURE

### 🎯 **NEW SIMPLIFIED TESTING APPROACH**

**Tests now run directly on the dev database with proper cleanup - no more complex worker isolation!**

#### **🧹 Core Principle: CLEAN STATE FOR EVERY TEST**
```typescript
// ✅ EVERY test must follow this pattern
test('My Test', async ({ browser }) => {
  const cleanup = TestCleanup.getInstance('My Test');
  
  try {
    // Your test code here
    const userId = await createUser();
    cleanup.trackDocument('users', userId);
    
    // Test assertions...
    
  } finally {
    await cleanup.cleanup(); // ALWAYS cleanup
  }
});
```

#### **🔐 Authentication Testing - CLEAN PATTERNS**
```typescript
// ✅ Use CleanAuthHelpers for authentication tests
import { CleanAuthHelpers } from '../helpers/clean-auth.helpers';

test('Auth Test', async ({ browser }) => {
  const auth = new CleanAuthHelpers(browser, 'Auth Test');
  
  try {
    await auth.initialize();
    await auth.loginAsAdmin();
    
    const isAuth = await auth.isAuthenticated();
    expect(isAuth).toBe(true);
    
  } finally {
    await auth.cleanup(); // Cleans sessions and test data
  }
});
```

#### **🗄️ Database Management - SIMPLIFIED**
```typescript
// ✅ All tests use the dev database
const dbUri = 'mongodb://localhost:27018/yggdrasil-dev';

// ✅ Track created resources for cleanup
cleanup.trackDocument('users', user._id);
cleanup.trackDocument('courses', course._id);

// ✅ Custom cleanup for complex scenarios
cleanup.addCustomCleanup(async () => {
  await cleanupComplexRelationships();
});

// ✅ Automatic demo user management
await testCleanupHooks.beforeAll(); // Ensures demo users exist
await testCleanupHooks.afterAll();  // Cleans up demo users
```

### 🚨 **CRITICAL CLEANUP RULES**

#### **✅ ALWAYS:**
- Use TestCleanup.getInstance() for every test
- Track all created database documents
- Use try/finally blocks to ensure cleanup runs
- Initialize demo users before tests start
- Clean up demo users after tests complete

#### **❌ NEVER:**
- Create data without tracking it for cleanup
- Skip cleanup on test failure
- Use worker-specific database naming
- Leave test data in the database
- Forget to handle demo user management

#### **🧪 Testing Commands - UPDATED**
```bash
# ✅ System overview (with cleanup)
npm run test:quiet

# ✅ Debug specific tests (with cleanup)
npm run test:single -- --grep "Test Name"

# ✅ Visual debugging (with cleanup)
npm run test:debug -- --grep "Test Name"
```

### 📚 **CLEANUP UTILITIES REFERENCE**

#### **Basic Cleanup**
```typescript
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';

const cleanup = TestCleanup.getInstance('Test Name');
cleanup.trackDocument('collection', id);
await cleanup.cleanup();
```

#### **Authentication Cleanup**
```typescript
import { CleanAuthHelpers } from '../helpers/clean-auth.helpers';

const auth = new CleanAuthHelpers(browser, 'Test Name');
await auth.cleanup(); // Cleans sessions and auth state
```

#### **Global Cleanup Hooks**
```typescript
import { testCleanupHooks } from '@yggdrasil/shared-utilities/testing';

test.beforeAll(async () => {
  await testCleanupHooks.beforeAll(); // Demo users, clean state
});

test.afterAll(async () => {
  await testCleanupHooks.afterAll(); // Final cleanup
});
```

#### **Transaction-Based Testing**
```typescript
// For complex tests that need automatic rollback
const result = await TestCleanup.withTransaction(
  'Transaction Test',
  async (session) => {
    // All operations here are automatically rolled back
    const user = await User.create([userData], { session });
    return user;
  }
);
```

### 🎯 **BENEFITS OF THE NEW APPROACH**

1. **Simplicity**: No complex worker detection or isolation
2. **Reality**: Tests run on the actual dev database structure
3. **Clarity**: Each test is responsible for its own cleanup
4. **Debugging**: Easier to understand what each test does
5. **Maintenance**: Less infrastructure code to maintain
6. **Speed**: Faster test execution without complex setup

## 🏭 REAL DATA TESTING ARCHITECTURE

### 🎯 **CRITICAL PRINCIPLE: NO MOCK DATA IN TESTS**

**Tests must use REAL data that mirrors production workflows. Mock data is FORBIDDEN.**

#### **🚨 Why Real Data Testing?**
- **Authentic scenarios**: Tests real user workflows and data patterns
- **Database accuracy**: Tests actual MongoDB queries and aggregations  
- **Performance reality**: Tests system performance with realistic data volumes
- **Edge case discovery**: Real data reveals edge cases that mocks hide
- **Production alignment**: Test data patterns match actual user behavior

#### **❌ FORBIDDEN: Mock Data Patterns**
```typescript
// ❌ NEVER use mock data in tests
const mockUserData = { id: 1, name: 'Test User' };
service.getStudentDashboard = jest.fn().returns(mockData);

// ❌ NEVER stub API responses
when(statisticsService.getProgress()).thenReturn(mockProgress);

// ❌ NEVER fake database queries  
const mockSubmissions = [{ score: 85 }, { score: 92 }];
```

#### **✅ REQUIRED: Real Data Patterns**
```typescript
// ✅ Create real users with authentic data
const student = await factory.users.createUser('student', {
  profile: { firstName: 'Active', lastName: 'Learner' }
});

// ✅ Create real courses with content structure
const courses = await factory.courses.createCoursesForTeacher(teacher._id, 3);

// ✅ Create real enrollments with progress patterns
const enrollments = await factory.enrollments.createEnrollmentsForStudent(
  student._id, courses, 'mixed' // realistic progress pattern
);
```

### 🏗️ **TEST DATA FACTORY SYSTEM**

#### **Master Factory Architecture**
```typescript
import { TestDataFactory } from '../helpers/TestDataFactory';

// ✅ Create comprehensive test factory for each test
const factory = new TestDataFactory('Test Name');

// Access domain-specific factories
factory.users     // UserDataFactory - creates real users with hashed passwords
factory.courses   // CourseDataFactory - creates courses with chapters/sections
factory.enrollments // EnrollmentDataFactory - creates realistic progress
factory.submissions // SubmissionDataFactory - creates exercise submissions
```

#### **User Data Factory - Authentic Users**
```typescript
// ✅ Create users with real authentication
const student = await factory.users.createUser('student');
// Creates: bcrypt-hashed password, valid profile, proper role

// ✅ Create complete user sets for complex scenarios
const users = await factory.users.createUserSet();
// Returns: { student, teacher, staff, admin } - all authenticated
```

#### **Course Data Factory - Realistic Content**
```typescript
// ✅ Create courses with authentic structure
const course = await factory.courses.createCourse(teacherId, {
  title: 'Advanced Programming',
  withContent: true, // Includes chapters, sections, exercises
  difficulty: 'intermediate'
});

// ✅ Create multiple courses for teachers
const courses = await factory.courses.createCoursesForTeacher(teacherId, 3);
// Creates: 3 courses with mixed status (draft, published, archived)
```

#### **Enrollment Data Factory - Realistic Progress**
```typescript
// ✅ Create enrollments with authentic progress patterns
const enrollments = await factory.enrollments.createEnrollmentsForStudent(
  studentId, 
  courses, 
  'mixed' // Creates realistic mixed progress: some completed, some active
);

// ✅ Available progress patterns:
// 'high' - High-achieving student (70-100% progress)
// 'low' - Struggling student (0-30% progress)  
// 'mixed' - Typical student (varied progress across courses)
```

#### **Submission Data Factory - Learning Activity**
```typescript
// ✅ Create exercise submissions with realistic patterns
const submissions = await factory.submissions.createSubmissions(
  studentId,
  courseId,
  8 // Number of submissions - creates varied scores/timing
);

// Generates: Realistic score distribution, submission timing, feedback
```

### 🎭 **TEST SCENARIO BUILDERS**

#### **Student Scenarios - Authentic Learning Journeys**
```typescript
import { TestScenarios } from '../helpers/TestScenarioBuilders';

// ✅ Create realistic student scenarios
const scenarios = TestScenarios.createStudentScenarios('Test Name');

// New student (empty state testing)
const { student } = await scenarios.createNewStudent();

// Active learner (normal progress) 
const { student, courses, enrollments, submissions } = await scenarios.createActiveStudent();

// High achiever (completed courses, achievements)
const { student, courses, submissions } = await scenarios.createHighAchievingStudent();

// Struggling learner (low progress, edge cases)
const { student, courses } = await scenarios.createStrugglingStudent();
```

#### **Teacher Scenarios - Real Classroom Workflows**
```typescript
const scenarios = TestScenarios.createTeacherScenarios('Test Name');

// New teacher (empty state)
const { teacher } = await scenarios.createNewTeacher();

// Active teacher (courses + students)
const { teacher, courses, students, enrollments, submissions } = 
  await scenarios.createActiveTeacher();
// Creates: 3 courses, 15 students, realistic enrollment distribution

// Experienced teacher (large classroom, performance testing)
const { teacher, courses, students } = await scenarios.createExperiencedTeacher();
// Creates: 5 courses, 40 students, high submission volume
```

#### **Admin Scenarios - Platform-Wide Data**
```typescript
const scenarios = TestScenarios.createAdminScenarios('Test Name');

// Platform with realistic activity
const { admin, teachers, students, courses, enrollments } = 
  await scenarios.createPlatformWithActivity();
// Creates: 8 teachers, 50 students, 20+ courses, realistic distributions

// Minimal platform (edge case testing)
const { admin, teachers, students } = await scenarios.createMinimalPlatform();
```

### 🧪 **REAL DATA TESTING PATTERNS**

#### **Statistics Dashboard Testing Example**
```typescript
test('Student Dashboard with Real Progress', async ({ page }) => {
  const cleanup = TestCleanup.getInstance('Student Dashboard Test');
  const authHelper = new CleanAuthHelper(page);
  
  try {
    // Create authentic student learning scenario
    const scenarios = TestScenarios.createStudentScenarios('Dashboard Test');
    const { student, courses, enrollments, submissions } = 
      await scenarios.createActiveStudent();
    
    // Login with real user credentials  
    await authHelper.loginWithCustomUser(student.email, 'TestPass123!');
    await page.goto('/statistics');
    
    // Test dashboard with REAL data
    await expect(page.locator('[data-testid="student-dashboard"]')).toBeVisible();
    
    // Verify real progress data is displayed
    const progressElements = page.locator('[data-testid*="progress"]');
    expect(await progressElements.count()).toBeGreaterThan(0);
    
    // Should show actual course count from real enrollments
    const courseCount = enrollments.length;
    const courseDisplay = page.locator(':has-text("' + courseCount + ' courses")');
    await expect(courseDisplay).toBeVisible();
    
    console.log(`✅ Tested with ${courses.length} courses, ${submissions.length} submissions`);
    
  } finally {
    await authHelper.clearAuthState();
    await cleanup.cleanup(); // Cleans ALL real test data
  }
});
```

#### **Empty State Testing with Real Users**
```typescript
test('New Student Empty State', async ({ page }) => {
  const cleanup = TestCleanup.getInstance('Empty State Test');
  const authHelper = new CleanAuthHelper(page);
  
  try {
    // Create REAL new student (no mock data)
    const scenarios = TestScenarios.createStudentScenarios('Empty State');
    const { student } = await scenarios.createNewStudent(); // No courses/activity
    
    await authHelper.loginWithCustomUser(student.email, 'TestPass123!');
    await page.goto('/statistics');
    
    // Test empty state with REAL authenticated user
    const emptyStateElements = page.locator(
      ':has-text("Start your learning"), :has-text("No courses")'
    );
    expect(await emptyStateElements.count()).toBeGreaterThan(0);
    
  } finally {
    await authHelper.clearAuthState();
    await cleanup.cleanup();
  }
});
```

### 🔧 **INTEGRATION WITH EXISTING SYSTEMS**

#### **Authentication Integration**
```typescript
// ✅ Real data factories integrate with CleanAuthHelper
const authHelper = new CleanAuthHelper(page);

// Login with factory-created users
await authHelper.loginWithCustomUser(student.email, 'TestPass123!');
// Works seamlessly - factory users have proper bcrypt passwords
```

#### **Database Integration**
```typescript
// ✅ All factories use real MongoDB models
import { 
  UserModel, 
  CourseModel, 
  CourseEnrollmentModel, 
  ExerciseSubmissionModel 
} from '@yggdrasil/database-schemas';

// Real database operations, real queries, real performance
const user = await UserModel.create(userData);
```

#### **Cleanup Integration**
```typescript
// ✅ All factories integrate with TestCleanup
const factory = new TestDataFactory('Test Name');
// Automatically tracks ALL created documents for cleanup

// Manual tracking if needed
factory.getCleanup().trackDocument('custom_collection', id);
```

### 🎯 **TESTING PHILOSOPHY: REALITY OVER CONVENIENCE**

#### **✅ Real Data Benefits**
1. **Catches real bugs**: Database queries, performance issues, edge cases
2. **Tests actual workflows**: End-to-end user journeys with authentic data
3. **Performance reality**: Real data volumes reveal scaling issues
4. **Production alignment**: Test data patterns match user behavior
5. **Confidence**: If tests pass, real users will succeed

#### **⚠️ Real Data Challenges & Solutions**
- **Test speed**: Mitigated by efficient cleanup and focused scenarios
- **Data complexity**: Addressed by scenario builders with realistic patterns  
- **Cleanup complexity**: Solved by comprehensive TestCleanup system
- **Test isolation**: Achieved through proper resource tracking

#### **🏆 SUCCESS METRICS**
Real data testing has achieved:
- **Zero test flakiness** from data inconsistencies
- **100% production alignment** - test scenarios match real usage
- **Comprehensive coverage** - all user roles and workflows tested
- **Performance insights** - real data reveals actual system bottlenecks

**Remember: Every test with real data is validation that the system works for actual users.**