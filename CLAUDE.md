# CLAUDE.md - Yggdrasil Development Guide

> *"Code with the wisdom of the World Tree - structured, interconnected, and ever-growing"*

## 🌳 Project Overview

**Yggdrasil Educational Platform** - A monorepo educational system with microservices architecture.

### Tech Stack
- **Frontend**: Next.js 14 + TypeScript + React 18
- **Backend**: Express.js microservices + TypeScript  
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT + refresh tokens
- **Testing**: Playwright with 4-worker parallelization

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

## 🧪 Testing Philosophy - FIX THE APP, NOT THE TEST

### 🚨 THE GOLDEN RULE
**When a test fails, the application has a bug. Fix the root cause in the application code, NEVER modify the test to pass.**

### 📋 Recommended Test Workflow

```bash
# ⚠️ IMPORTANT: Avoid test:quiet to prevent timeouts
# Instead, run test suites individually for better reliability:

# 1. AUTHENTICATION & SECURITY - Run first (most critical)
npm run test:single -- --grep "Authentication Security"

# 2. USER MANAGEMENT - Core functionality
npm run test:single -- --grep "User Management"

# 3. COURSE MANAGEMENT - Educational features
npm run test:single -- --grep "Course Management"

# 4. NEWS MANAGEMENT - Content management
npm run test:single -- --grep "News Management"

# 5. PLANNING MANAGEMENT - Calendar & events
npm run test:single -- --grep "Planning Management"

# 6. PLATFORM FEATURES - Cross-cutting concerns
npm run test:single -- --grep "Platform Features"

# 7. SYSTEM INTEGRATION - End-to-end workflows
npm run test:single -- --grep "System Integration"

# 8. FOCUS - Debug ONE failing test at a time
npm run test:single -- --grep "specific test name"

# 9. FIX - Modify application code (NOT test code)

# 10. VERIFY - Run the single test again

# 11. REPEAT - Back to step 1 until 100% pass
```

### ⚡ Testing Best Practices

**✅ ALWAYS:**
- Run test suites individually to avoid timeouts
- Work on ONE test at a time
- Fix the root cause in app code
- Wait for tests to complete naturally
- Read error messages carefully
- Check browser screenshots/traces on failure

**❌ NEVER:**
- Run `test:quiet` (causes timeouts with 4 workers)
- Skip or disable failing tests
- Modify tests to make them pass
- Add arbitrary waits without understanding why
- Interrupt test execution prematurely
- Test manually instead of using the suite
- Assume a test is "flaky" - find the real issue

### 🎯 Current Test Architecture
- **42 functional tests** covering all user workflows
- **4-worker parallelization** with complete isolation
- **Enhanced isolation system** - each test gets fresh data
- **Automatic service management** via Playwright

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

```bash
# Testing (⚠️ AVOID test:quiet - causes timeouts)
npm run test:single -- --grep "Authentication Security"  # Run auth tests
npm run test:single -- --grep "User Management"         # Run user tests
npm run test:single -- --grep "Course Management"       # Run course tests
npm run test:single -- --grep "News Management"         # Run news tests
npm run test:single -- --grep "Planning Management"     # Run planning tests
npm run test:single -- --grep "Platform Features"       # Run platform tests
npm run test:single -- --grep "System Integration"      # Run integration tests

# Debug specific tests
npm run test:single -- --grep "specific test name"      # Debug single test
npm run test:debug -- --grep "specific test name"       # Run with browser UI

# Development  
npm run dev                 # Start all services
npm run dev:health          # Check service status
npm run typecheck           # TypeScript validation
npm run clean               # Clean test artifacts
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

1. **Run authentication tests**: `npm run test:single -- --grep "Authentication Security"`
2. **Run user management tests**: `npm run test:single -- --grep "User Management"`
3. **Continue with other suites**: Follow the recommended execution order
4. **Debug failures**: `npm run test:single -- --grep "failing test"`
5. **Fix app code**: Never modify tests to pass
6. **Verify fix**: Re-run the single test
7. **Confirm all pass**: Run all suites individually again

## 💡 Debugging Tips

- **Timeout errors**: Service is slow, not broken - add proper waits
- **Element not found**: Check for dynamic loading, wait for elements
- **Auth failures**: Token expiry or race condition - check timing
- **Flaky tests**: There's always a root cause - investigate thoroughly

Remember: **Every test failure represents a real user-facing bug. Fix it properly.**