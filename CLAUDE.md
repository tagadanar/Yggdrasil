# CLAUDE.md - Development Best Practices for Yggdrasil

> *"Code with the wisdom of the World Tree - structured, interconnected, and ever-growing"*

## 🌳 Project Overview

Comprehensive guide for developing the **Yggdrasil Educational Platform**. Architectural patterns, coding standards, testing practices, and development workflows.

## 🏗️ Architecture Overview

### Monorepo Structure
- **Package Manager**: npm workspaces | **Build**: TypeScript + Next.js | **Database**: MongoDB + Mongoose | **Auth**: JWT + refresh tokens

```
packages/
├── frontend/              # Next.js 14 + React 18 + TypeScript
├── api-services/          # Microservices (Express.js + TypeScript)
│   ├── auth-service/      # Authentication and authorization
│   ├── course-service/    # Course management
│   ├── user-service/      # User management  
│   ├── news-service/      # News and announcements
│   ├── planning-service/  # Calendar and scheduling
│   └── statistics-service/ # Analytics and reporting
├── database-schemas/      # Mongoose models and database connection
├── shared-utilities/      # Common utilities, validation, types
└── testing-utilities/     # Test setup and utilities (94 tests)
```

## 📋 Current Project State

### 🏗️ Implementation Status
- **Frontend**: Next.js 14 with TypeScript, dashboard layout with sidebar navigation
- **Auth Service**: JWT-based authentication with refresh tokens, bcrypt password hashing
- **User Service**: CRUD operations, role-based access control (admin, staff, teacher, student)
- **News Service**: CRUD operations, role-based permissions, real-time UI updates
- **Database**: MongoDB with Mongoose, User model with profile and preferences, NewsArticle model with seed data
- **Shared Utilities**: Centralized JWT handling (SharedJWTHelper), response helpers, validation, constants
- **Testing**: 94 comprehensive functional tests with isolated auth helpers (JWT authentication fixed ✅)

### 🎯 Active Services & Ports
- **Frontend**: http://localhost:3000 (Next.js)
- **Auth Service**: http://localhost:3001 (Express + JWT)
- **User Service**: http://localhost:3002 (Express + MongoDB)
- **News Service**: http://localhost:3003 (Express + MongoDB)
- **Database**: MongoDB connection via Mongoose

### 📊 Test Suite Details
```
tests/
├── auth/auth-ui-flows.spec.ts              # 15 tests - Login/logout workflows
├── environment/environment-validation.spec.ts  # 17 tests - Service health, demo accounts
├── environment/navigation-validation.spec.ts   # 11 tests - Sidebar, routing, permissions
├── functional/news-management.spec.ts       # 17 tests - News CRUD, role-based access
├── functional/user-management.spec.ts       # 27 tests - Admin functions, user operations
├── helpers/isolated-auth.helpers.ts         # Authentication isolation system
├── helpers/test-isolation.ts                # User pool management
├── global-setup.ts                          # Demo user + news article creation
└── global-teardown.ts                       # Test cleanup and user removal
```

### 🔐 Authentication System
- **Demo Accounts**: admin@yggdrasil.edu, teacher@yggdrasil.edu, staff@yggdrasil.edu, student@yggdrasil.edu
- **Test Users**: Dynamic creation with pattern `test-{role}-{timestamp}-{index}-{randomId}@test.yggdrasil.local`
- **Isolation**: Each test gets unique users, no shared state between tests
- **Cleanup**: Automatic user creation/destruction per test execution

### 🛠️ Key Components
- **IsolatedAuthHelpers**: Provides `loginAsAdmin()`, `loginAsTeacher()`, `loginAsStaff()`, `loginAsStudent()`
- **TestIsolationManager**: Manages user pools and prevents race conditions
- **DashboardLayout**: Sidebar navigation with role-based menu items
- **ProtectedRoute**: Route guards based on user roles
- **ResponseHelper**: Standardized API response format

### 📁 Current Working Directory
```
/home/tagada/Desktop/Yggdrasil/packages/testing-utilities/
├── playwright.config.ts          # 2 workers, 60s timeout, no retries
├── package.json                   # test:quiet, test:single commands
├── service-manager.js             # Automatic service lifecycle management
├── tests/                         # 94 functional tests
└── node_modules/                  # Playwright, TypeScript dependencies
```

### 🎨 UI Components & Pages
- **Login Page**: `/auth/login` with demo account buttons
- **News Page**: `/news` with full CRUD operations ✅
- **User Management**: `/admin/users` (admin only) with CRUD operations
- **Profile Page**: `/profile` with user information and preferences
- **Navigation**: Sidebar with News, Courses, Planning, Statistics, Users (admin only)

### 🔧 Available Commands
```bash
# From /packages/testing-utilities/
npm run test:quiet           # Overview of all 94 tests
npm run test:single -- --grep "test name"  # Debug specific test
npm run test:unit            # Business logic tests
npm run dev                  # Start all services
npm run lint                 # Code style check
npm run typecheck            # TypeScript validation
```

## 🎯 Core Development Principles

### 1. **Clean Architecture**
- **Controllers**: HTTP requests/responses only | **Services**: Business logic | **Models**: Database entities | **Utilities**: Pure functions

### 2. **Type Safety First**
- **MANDATORY**: All code in TypeScript, no `any` types except legacy migration
- **USE**: Zod for runtime validation, shared types from `@shared/types`

### 3. **Error Handling**
- **ALWAYS**: Return structured responses via `ResponseHelper` | **NEVER**: Expose sensitive information | **VALIDATE**: All inputs at controller level

### 4. **Security by Design**
- **NEVER**: Commit secrets to version control | **ALWAYS**: Use environment variables | **MANDATORY**: bcrypt for passwords, validate/sanitize inputs

### 5. **Shared Utilities First**
- **ALWAYS PREFER**: Shared utilities from `@yggdrasil/shared-utilities` over local implementations
- **CENTRALIZE**: JWT handling, authentication, validation, constants, types, and helpers
- **AVOID**: Duplicating logic across services - if it can be shared, it should be shared
- **EXAMPLES**: Use `SharedJWTHelper` for all JWT operations, `ResponseHelper` for API responses, shared constants for configuration

### 6. **Minimal Dependencies & Simplicity**
- **QUESTION EVERY DEPENDENCY**: "Can we do this with vanilla JS/TS?"
- **AVOID**: Over-engineering, unnecessary libraries | **PREFER**: Built-in solutions, smaller bundle size

#### Dependency Evaluation (MANDATORY)
Before adding any dependency:
- [ ] Can this be done with <20 lines of vanilla JS/TS?
- [ ] Does this solve a genuinely complex problem?
- [ ] Is the library actively maintained and secure?
- [ ] Will this be relevant in 2+ years?
- [ ] Does benefit outweigh bundle cost?

#### Examples
```typescript
// ❌ BAD: Unnecessary library
import _ from 'lodash';
const unique = _.uniq(users.map(u => u.email));

// ✅ GOOD: Native solution
const unique = [...new Set(users.map(u => u.email))];

// ✅ WHEN TO USE LIBRARIES: Complex, security-critical tasks
import bcrypt from 'bcrypt';        // Security-critical
import jwt from 'jsonwebtoken';     // Standard complexity
import mongoose from 'mongoose';    // Real abstraction value
```

### 6. **Clean Code Principles - DRY, KISS, SOLID**

#### DRY - Extract Common Logic
```typescript
// ❌ BAD: Repeated validation
if (!req.body.email?.includes('@')) return res.status(400).json({error: 'Invalid email'});

// ✅ GOOD: Extracted validation
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
```

#### KISS - Simple Solutions
```typescript
// ❌ BAD: Over-complex
const getUserAge = (user: User) => {
  // Complex date math...
};

// ✅ GOOD: Simple and clear
const getUserAge = (birthDate: Date) => {
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthday = today.getMonth() > birthDate.getMonth() || 
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  return hasHadBirthday ? age : age - 1;
};
```

## 📏 Code Standards

### File Organization
```
src/
├── controllers/          # HTTP handlers
├── services/            # Business logic  
├── middleware/          # Request/response middleware
├── routes/              # Route definitions
├── types/               # Service-specific types
└── index.ts            # Entry point
```

### Naming Conventions
- **Files**: PascalCase (components), camelCase (utilities)
- **Classes**: PascalCase (`AuthService`, `UserController`)
- **Functions**: camelCase (`getUserById`, `validateEmail`)
- **Variables**: camelCase (`userEmail`, `isAuthenticated`)
- **Constants**: UPPER_SNAKE_CASE (`HTTP_STATUS`, `JWT_SECRET`)

### Comments - EXPLAIN WHY, NOT WHAT
```typescript
// ❌ BAD: Obvious comments
// Get user by id
return users.find(u => u.id === id);

// ✅ GOOD: Explain reasoning
// Early return to prevent user enumeration attacks
if (!user) return { success: false, error: 'Invalid credentials' };

// Bcrypt handles timing-safe comparison internally
const isValid = await bcrypt.compare(password, user.password);
```

## 🧪 Testing Strategy - Proven Workflow

### 🚨 MANDATORY TESTING WORKFLOW - NEVER DEVIATE

**This is the ONLY way to work with tests in this project. Follow this process religiously.**

#### ⚡ THE PROVEN CYCLE

```bash
# 1. OVERVIEW - See all issues at once
npm run test:quiet

# 2. FOCUS - Pick ONE failing test and work on it
npm run test:single -- --grep "specific test name"

# 3. FIX - Make the test pass (fix app, not test)
# 4. REPEAT - Go back to step 1 until all tests pass
```

#### ⏱️ CRITICAL: Test Execution Timing

**NEVER interrupt functional tests with 2-minute timeout - you'll miss the actual output!**

- **Functional tests take 3-5 minutes** to complete all 94 tests
- **Single tests take 10-60 seconds** depending on the workflow
- **ALWAYS wait for completion** to see real results
- **Test timeout interruption** prevents you from seeing which tests actually failed
- **Real output is essential** for debugging and fixing issues

#### 🔒 STRICT ADHERENCE RULES

**❌ NEVER DO THESE:**
- **Manual testing** instead of running the test suite
- **Temporary workarounds** or manual curl commands
- **Skip failing tests** - every test must pass
- **Modify tests to pass** - fix the application, not tests
- **Run parallel tests** while debugging (use single test mode)
- **Ignore test failures** - they represent real issues
- **Interrupt test execution** with 2-minute timeout - wait for completion

**✅ ALWAYS DO THESE:**
- **Run `npm run test:quiet` first** to see the full picture
- **Work on ONE test at a time** using `npm run test:single`
- **Fix the application code** to make tests pass
- **Verify the fix** by running the test again
- **Clean output** - no verbose logging or retries
- **Wait for test completion** - let tests finish naturally (3-5 minutes for full suite)

### 🎯 FUNCTIONAL TESTS = SYSTEM TRUTH

**The functional test suite is the source of truth for the entire platform.**

#### 📊 Current Test Suite Status
- **94 comprehensive tests** covering all user workflows
- **5 test files** with complete isolation
- **Zero race conditions** - tests run independently
- **Fail-fast design** - immediate feedback on real issues
- **Clean output** - focus on results, not noise

#### 🔍 Test Categories
1. **Authentication Flows** (15 tests) - Login, logout, validation
2. **Navigation System** (11 tests) - Sidebar, routing, permissions
3. **Environment Validation** (17 tests) - Services, demo accounts, APIs
4. **News Management** (24 tests) - CRUD operations, role-based access
5. **User Management** (27 tests) - Admin functions, user operations

#### 🛡️ Test Isolation System
- **IsolatedAuthHelpers**: Each test gets unique users
- **No shared state**: Tests don't interfere with each other
- **Automatic cleanup**: Users created/destroyed per test
- **Parallel execution**: Optimized for 2 workers
- **No retries**: Tests fail fast on real issues

### 🚨 CRITICAL: Service Management

**Services are managed automatically by Playwright. NEVER manage them manually.**

#### ✅ CORRECT Test Commands
```bash
# Overview of all test status (WAIT 3-5 MINUTES for completion)
npm run test:quiet                     # Clean dot output, see pass/fail status

# Debug specific failing test (WAIT 10-60 seconds for completion)
npm run test:single -- --grep "test name"  # Run one test with detailed output

# Alternative single test command
npm run test:single -- --grep "Admin should have access"  # Partial name match
```

#### ⏱️ EXECUTION TIME EXPECTATIONS
- **`npm run test:quiet`**: 3-5 minutes for all 94 tests
- **`npm run test:single`**: 10-60 seconds per individual test
- **Setup time**: 10-15 seconds for service warm-up
- **Cleanup time**: 5-10 seconds for user cleanup
- **NEVER interrupt**: Let tests complete naturally for accurate results

#### ❌ WRONG Commands (NEVER USE)
```bash
npm run test:services:start    # OUTDATED - Services auto-managed
npm run test:services:stop     # OUTDATED - Services auto-managed
npm run test:services:clean    # OUTDATED - Services auto-managed
npm run test:functional        # TOO VERBOSE - Use test:quiet instead
node service-manager.js start  # NEVER DO THIS - Services auto-start during tests
```

#### 🔧 Service Management Facts
- **Playwright manages services**: Automatic startup/shutdown via webServer config
- **Port management**: Automatic conflict detection and cleanup
- **Fresh environment**: Each test run gets clean services
- **No manual intervention**: Everything is automated
- **Service startup**: Triggered automatically by `playwright.config.ts` webServer setting

### 📏 Test Development Guidelines

#### ✅ WHAT TO TEST (High Value)
- **User workflows**: Login, navigation, CRUD operations
- **Permission boundaries**: Role-based access control
- **Critical paths**: Authentication, data validation
- **Error handling**: Invalid inputs, edge cases

#### ❌ WHAT NOT TO TEST (Low Value)
- **Framework internals**: Express routes, Mongoose schemas
- **Third-party libraries**: External API wrappers
- **Trivial operations**: Simple getters, basic assignments

#### 🎯 Test Quality Standards
- **Isolated tests**: No shared state or dependencies
- **Clear test names**: Describe the exact scenario
- **Fail-fast design**: Immediate feedback on issues
- **Clean output**: Minimal logging, focus on results

### 🔄 TDD Workflow (When Applicable)

#### ✅ USE TDD FOR:
- **New features**: Write test → implement → refactor
- **Bug fixes**: Reproduce issue → fix → verify
- **Business logic**: Complex algorithms, validation rules

#### 🚀 TDD Cycle
```typescript
// 1. RED - Write failing test
it('should validate email format', () => {
  expect(validateEmail('invalid')).toBe(false);
});

// 2. GREEN - Minimal implementation
const validateEmail = (email: string) => email.includes('@');

// 3. REFACTOR - Improve while keeping tests green
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
```

### 🚨 EMERGENCY PROCEDURES

If tests are failing systematically:

1. **Check services**: Ensure all services are running
2. **Run test:quiet**: Get overview of all failures
3. **Pick ONE test**: Use test:single to focus
4. **Fix root cause**: Address the application issue
5. **Verify fix**: Run the test again to confirm

**NEVER:**
- Skip failing tests
- Modify tests to pass
- Add retries or workarounds
- Ignore systematic failures

### 📊 Test Infrastructure Details

#### 🔧 Technology Stack
- **Playwright**: Browser automation framework
- **TypeScript**: Type-safe test development
- **Isolated Auth**: Unique users per test
- **Parallel Execution**: 2 workers for optimal performance
- **Automatic Cleanup**: No test data pollution

#### 🏗️ Test Architecture
```
tests/
├── auth/                  # Authentication flows
├── environment/           # System validation
├── functional/            # User workflows
├── helpers/               # Test utilities
│   ├── isolated-auth.helpers.ts  # Authentication isolation
│   └── test-isolation.ts         # User management
├── global-setup.ts        # Test initialization
└── global-teardown.ts     # Test cleanup
```

#### ⚙️ Configuration
- **2 workers**: Optimal for parallel execution
- **60s timeout**: Per test timeout
- **300s global**: Total suite timeout
- **No retries**: Fail-fast on real issues
- **Clean output**: Minimal logging

## 🔧 Development Workflow

### Environment Setup
```bash
npm install                # Dependencies
npm run setup:db          # Database
npm run dev               # All services (foreground mode)
```

### 🏗️ Shared Utilities Usage
When implementing new features, ALWAYS check `@yggdrasil/shared-utilities` first:
- **JWT Operations**: Use `SharedJWTHelper` instead of local JWT implementations
- **API Responses**: Use `ResponseHelper` for consistent response formatting
- **Constants**: Use shared constants (JWT_CONFIG, HTTP_STATUS, ERROR_MESSAGES, etc.)
- **Types**: Import from shared types (User, AuthTokens, JWTPayload, etc.)
- **Validation**: Use shared validation schemas and helpers

### 🚨 CRITICAL: Proper Development Server Usage

**✅ CORRECT - New Service Manager:**
```bash
npm run dev               # Managed services with automatic cleanup
npm run dev:health        # Check service health
```

**❌ WRONG - Old Manual Methods:**
```bash
npm run dev &             # OLD WAY - Causes port conflicts
npx concurrently          # OLD WAY - Use service manager instead
lsof -ti:3000 | xargs kill # OLD WAY - Use npm run dev:clean
```

**Development Rules:**
- **Foreground mode**: Live logs, proper signal handling
- **Port management**: Auto-clears ports before starting

### Git Workflow
```bash
# Branch naming
git checkout -b feature/user-authentication
git checkout -b fix/login-validation-bug

# Commit format  
git commit -m "feat: add user registration with email verification"
git commit -m "fix: resolve password validation edge case"
```

### Code Quality Commands
```bash
npm run lint              # Check style
npm run lint:fix          # Fix issues
npm run typecheck         # TypeScript validation
npm run build             # Production build
```

## 📊 Code Quality Standards

### Code Review Checklist
- [ ] TypeScript types for all functions
- [ ] Using shared utilities from `@yggdrasil/shared-utilities` where applicable
- [ ] Consistent error handling via `ResponseHelper`
- [ ] JWT operations use `SharedJWTHelper` (not local implementations)
- [ ] Input validation at boundaries
- [ ] No hardcoded secrets
- [ ] DRY, KISS, SOLID principles followed
- [ ] **New dependencies justified** - Could vanilla JS/TS work?
- [ ] Comments explain WHY, not WHAT
- [ ] Tests written BEFORE implementation (if using TDD)

## 🚀 Performance & Security

### Backend Performance
- MongoDB indexing for frequent queries | Connection pooling | Rate limiting | Caching for expensive operations

### Frontend Performance  
- Next.js code splitting | React.memo for expensive components | Image optimization | SWR for data fetching

### Security (MANDATORY)
- **Authentication**: JWT + refresh token rotation + RBAC + token validation on protected routes
- **Data Protection**: No logging sensitive data + HTTPS + proper CORS + input sanitization

## 🌟 The 10 Commandments of Yggdrasil Development

1. **Type Everything**: TypeScript mandatory
2. **Keep It Simple**: KISS > clever code, minimal dependencies  
3. **Don't Repeat Yourself**: Extract common logic
4. **Question Every Dependency**: Can vanilla JS/TS do this?
5. **Test First When Possible**: TDD for business logic and bug fixes
6. **Comment the WHY**: Code shows how, comments show why
7. **Handle Errors Gracefully**: Users deserve good error messages
8. **Secure by Default**: Never trust user input
9. **Review Before Merge**: Four eyes better than two
10. **Document Changes**: Update docs with code changes

## 🚨 CRITICAL: Testing Protocol Enforcement

### 🔒 MANDATORY FOR ALL DEVELOPMENT WORK

**When working on ANY issue, bug, or feature that might affect the application:**

```bash
# STEP 1: ALWAYS start with this command
npm run test:quiet

# STEP 2: Pick ONE failing test and run it
npm run test:single -- --grep "specific test name"

# STEP 3: Fix the application code (never modify the test)
# STEP 4: Run the test again to verify the fix
# STEP 5: Repeat until all tests pass
```

### ⚠️ ZERO TOLERANCE POLICY

**These actions will BREAK the project and are FORBIDDEN:**

❌ **Manual testing** instead of using the test suite  
❌ **Skipping failing tests** or marking them as pending  
❌ **Modifying tests** to make them pass  
❌ **Adding retries** or workarounds to mask failures  
❌ **Running services manually** instead of using Playwright automation  
❌ **Ignoring test output** or not reading failure messages  

### ✅ REQUIRED BEHAVIOR

**Every development session MUST follow this pattern:**

1. **Start with `npm run test:quiet`** to see the current state **(WAIT 3-5 MINUTES)**
2. **Work on ONE test at a time** using `npm run test:single` **(WAIT 10-60 SECONDS)**
3. **Fix the root cause** in the application code
4. **Verify the fix** by running the test again **(WAIT FOR COMPLETION)**
5. **Move to the next failing test** and repeat

### ⏱️ PATIENCE IS CRITICAL

**The most common mistake is interrupting tests with 2-minute timeout!**

- **Functional tests are NOT unit tests** - they take time to complete
- **Real browser automation** requires patience for accurate results
- **Interrupting tests** means you miss the actual failures
- **Incomplete output** leads to wrong conclusions and wasted time
- **Always wait for natural completion** to see the true state

### 🎯 SUCCESS METRICS

**The project is considered healthy when:**
- **All tests pass** in `npm run test:quiet`
- **No manual interventions** are needed for testing
- **Clean output** with no verbose logging or retries
- **Fast feedback** with immediate failure detection

**Remember**: The test suite is the single source of truth for the entire platform. Trust it, use it, and maintain it.

## 🎯 Quick Reference Commands

```bash
# Development
npm run dev                 # All services via service manager (auto-cleanup)
npm run dev:health          # Check service health status

# Testing (MANDATORY WORKFLOW - WAIT FOR COMPLETION)
npm run test:quiet         # Overview of all test status (WAIT 3-5 MINUTES)
npm run test:single -- --grep "test name"  # Debug specific failing test (WAIT 10-60 SECONDS)
npm run test:unit          # Fast unit tests (business logic)

# Quality & Build
npm run lint               # Code style check
npm run typecheck          # TypeScript validation
npm run build              # Production build
npm run setup:db           # Database setup
npm run seed               # Test data
```

---

**Remember**: This is a living document. Always prioritize code quality over delivery speed.