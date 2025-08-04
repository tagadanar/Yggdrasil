# CLAUDE.md - Yggdrasil Development Guide

> *"Code with the wisdom of the World Tree - structured, interconnected, and ever-growing"*

## 🌳 Project Overview

**Yggdrasil Educational Platform** - Monorepo educational system with microservices architecture.

**Tech Stack**: Next.js 14, Express.js, MongoDB, JWT auth, Playwright testing

**Services & Ports**: Frontend (3000), Auth (3001), User (3002), News (3003), Course (3004), Planning (3005), Statistics (3006)

### 🚨 CLEAN TESTING ARCHITECTURE
- **Two-command system**: `test:quiet` (overview) + `test:single` (debug)
- **Direct dev database**: `mongodb://localhost:27018/yggdrasil-dev`
- **Automatic cleanup**: TestCleanup utility tracks/removes all test resources
- **No worker isolation**: Simplified, reality-based testing

### ⛔ CRITICAL: NEVER MANUALLY START SERVICES DURING TESTING

**FORBIDDEN during tests**: `npm run dev`, `npm run dev:health`, manual service commands

**WHY**: Tests auto-manage services via Playwright. Manual services cause conflicts, port issues, persistent processes.

**If accidentally started**: `pkill -f "ts-node-dev|next|node.*service" || true`

## 🔐 Authentication System - DO NOT BREAK!

### Working Components (NEVER MODIFY):
- ✅ bcrypt password hashing in `database-isolation.ts:245-247`
- ✅ User lookup with `User.findByEmail()` and `User.findById()`
- ✅ Test user creation flow in `createIsolatedUser()`
- ✅ Database connection logic in auth service

### ⏰ CRITICAL: Authentication Timing (2-3s total) - OPTIMIZED

**Frontend auth flow**: API call → Response → Token storage → State update → Navigation → Page load

```typescript
// ✅ OPTIMIZED: Wait for navigation AND cookies with retry logic
await page.waitForFunction(
  () => {
    const notOnLoginPage = !window.location.pathname.includes('/auth/login');
    const hasCookies = document.cookie.includes('yggdrasil_access_token') || 
                      document.cookie.includes('yggdrasil_refresh_token');
    return notOnLoginPage && hasCookies;
  },
  { timeout: 15000 } // OPTIMIZED: 15s timeout with retry logic
);
await page.waitForTimeout(500); // Reduced buffer for state sync
```

**Use auth helpers**: `AuthTestHelper` or `CleanAuthHelper` with built-in retry logic - NEVER custom timing!

## 🛠️ Shared Utilities - ALWAYS USE!

**BEFORE coding, CHECK `@yggdrasil/shared-utilities`!**

### Available Utilities:
```typescript
// Authentication & JWT
import { SharedJWTHelper, AuthMiddleware } from '@yggdrasil/shared-utilities';
const token = SharedJWTHelper.generateAccessToken(user);

// API Responses
import { ResponseHelper } from '@yggdrasil/shared-utilities';
return ResponseHelper.success(data);

// Testing Infrastructure
import { startTestEnvironment, WorkerConfigManager } from '@yggdrasil/shared-utilities';
const testEnv = await startTestEnvironment();

// Types & Validation
import { UserType, loginSchema } from '@yggdrasil/shared-utilities';
const validated = loginSchema.parse(data);
```

### ❌ NEVER Implement Locally:
- Port calculation, worker detection, database setup
- JWT operations, response formatting
- Service management, validation schemas

## 🧪 Testing Commands

### Two-Command Architecture:
```bash
npm run test:quiet   # Overview - all suites, clean output - long run, above 30mn
npm run test:single  # Debug - detailed logs - run under 5mn
npm run test:debug   # Visual debugging
```

### Testing Philosophy: FIX THE APP, NOT THE TEST!

**Workflow**:
1. `npm run test:quiet` - Check health
2. `npm run test:single -- --grep "Suite Name"` - Debug failures
3. Fix application code (NEVER modify tests)
4. Re-run to verify

### Test Suites (26 comprehensive test suites):

#### **Playwright Integration Tests** (testing-utilities):
- **Focused Authentication Test** [CRITICAL]: Quick auth verification
- **Authentication Security - Comprehensive Workflows** [CRITICAL]: JWT, sessions, security
- **User Management - Core Functionality** [HIGH]: CRUD operations
- **User Management - API Endpoints** [HIGH]: REST API validation
- **User Management - UI Components** [HIGH]: Frontend interactions
- **User Management - Integration Workflows** [HIGH]: End-to-end user flows
- **Course Management** [HIGH]: Educational content workflows
- **Instructor Teaching Workflow - Optimized** [HIGH]: Teaching scenarios
- **Student Learning Journey - Optimized** [HIGH]: Learning progression
- **News Management** [MEDIUM]: Article lifecycle
- **Planning Management** [MEDIUM]: Calendar and events
- **Statistics Management - Real Data Scenarios** [MEDIUM]: Analytics & reporting
- **Platform Features** [MEDIUM]: Core platform functionality
- **Profile Editing Functionality** [MEDIUM]: User profile management
- **Role-Based Access Control Matrix** [HIGH]: RBAC validation
- **UI States and Error Handling** [HIGH]: Frontend resilience
- **Instructor Student Management Integration** [HIGH]: Teacher-student workflows
- **Instructor Course Creation Integration** [HIGH]: Course creation flows
- **Instructor Communication Integration** [MEDIUM]: Communication tools
- **System Integration Tests** [CRITICAL]: Full E2E system validation

#### **Jest Unit/Service Tests** (individual packages):
- **Auth Service Tests** [CRITICAL]: Unit + functional authentication
- **User Service Tests** [HIGH]: Unit + functional user operations
- **News Service Tests** [MEDIUM]: Unit + integration + functional + edge cases
- **Statistics Service Tests** [MEDIUM]: Unit testing analytics
- **Database Schemas Tests** [HIGH]: Unit + integration data validation
- **Shared Utilities Tests** [HIGH]: Unit + integration utility functions

### Individual Test Examples:
```bash
# Debug specific Playwright test suites
npm run test:single -- --grep "Focused Authentication Test"
npm run test:single -- --grep "Authentication Security"
npm run test:single -- --grep "User Management - Core Functionality"
npm run test:single -- --grep "Course Management"
npm run test:single -- --grep "Instructor Teaching Workflow"
npm run test:single -- --grep "Student Learning Journey"
npm run test:single -- --grep "Statistics Management"
npm run test:single -- --grep "System Integration"

# Run Jest tests by service
npm run test --workspace=@yggdrasil/auth-service
npm run test --workspace=@yggdrasil/user-service
npm run test --workspace=@yggdrasil/shared-utilities
npm run test --workspace=@yggdrasil/database-schemas
```

## 🏗️ Clean Testing Architecture

### Core Pattern - ALWAYS Use:
```typescript
test('My Test', async ({ browser }) => {
  const cleanup = TestCleanup.getInstance('My Test');
  
  try {
    // Test logic
    const userId = await createUser();
    cleanup.trackDocument('users', userId);
    
  } finally {
    await cleanup.cleanup(); // MANDATORY
  }
});
```

### Authentication Testing:
```typescript
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';

const auth = new CleanAuthHelper(browser, 'Test Name');
try {
  await auth.initialize();
  await auth.loginAsAdmin();
  // Test logic
} finally {
  await auth.cleanup();
}
```

### Cleanup Rules:
- ✅ ALWAYS: Use TestCleanup, track documents, try/finally
- ❌ NEVER: Skip cleanup, leave test data, use worker isolation

## 🏭 Real Data Testing - NO MOCKS!

### CRITICAL: Tests use REAL data mirroring production

**FORBIDDEN**:
```typescript
// ❌ NEVER mock data
const mockUser = { id: 1, name: 'Test' };
jest.fn().returns(mockData);
```

**REQUIRED**:
```typescript
// ✅ Create real data
const student = await factory.users.createUser('student');
const courses = await factory.courses.createCoursesForTeacher(teacherId, 3);
const enrollments = await factory.enrollments.createEnrollmentsForStudent(
  studentId, courses, 'mixed'
);
```

### Test Data Factory System:
```typescript
import { TestDataFactory } from '../helpers/TestDataFactory';

const factory = new TestDataFactory('Test Name');
// Provides comprehensive factories:
factory.users        // Creates users with bcrypt passwords, profiles, roles
factory.courses      // Creates courses with chapters, sections, exercises
factory.enrollments  // Creates realistic progress patterns (high/low/mixed)
factory.submissions  // Creates exercise submissions with varied scores
```

### Test Scenario Builders - Realistic User Journeys:
```typescript
import { TestScenarios } from '../helpers/TestScenarioBuilders';

// Student scenarios with authentic learning patterns
const scenarios = TestScenarios.createStudentScenarios('Test');
const { student } = await scenarios.createNewStudent(); // Empty state
const { student, courses, enrollments } = await scenarios.createActiveStudent(); // Normal progress
const { student, courses, submissions } = await scenarios.createHighAchievingStudent(); // Top performer

// Teacher scenarios with realistic classrooms
const teacherScenarios = TestScenarios.createTeacherScenarios('Test');
const { teacher, courses, students } = await scenarios.createActiveTeacher(); // 3 courses, 15 students
const { teacher, courses, students } = await scenarios.createExperiencedTeacher(); // 5 courses, 40 students

// Admin scenarios for platform-wide testing
const adminScenarios = TestScenarios.createAdminScenarios('Test');
const { admin, teachers, students, courses } = await scenarios.createPlatformWithActivity();
```

### Real Data Patterns:
- **Student Progress**: `'high'` (70-100%), `'low'` (0-30%), `'mixed'` (varied)
- **Course Structure**: Chapters, sections, exercises with realistic content
- **Submissions**: Varied scores, timing patterns, authentic feedback
- **User Distribution**: Realistic role ratios and activity patterns

### Example - Real Data Test:
```typescript
test('Student Dashboard', async ({ page }) => {
  const cleanup = TestCleanup.getInstance('Dashboard Test');
  const authHelper = new CleanAuthHelper(page);
  
  try {
    // Create REAL learning scenario
    const scenarios = TestScenarios.createStudentScenarios('Test');
    const { student, courses, enrollments, submissions } = 
      await scenarios.createActiveStudent();
    
    // Test with REAL authenticated user
    await authHelper.loginWithCustomUser(student.email, 'TestPass123!');
    await page.goto('/statistics');
    
    // Verify REAL data displays
    const progressElements = page.locator('[data-testid*="progress"]');
    expect(await progressElements.count()).toBeGreaterThan(0);
    
  } finally {
    await authHelper.clearAuthState();
    await cleanup.cleanup();
  }
});
```

## 🏗️ Development Principles

1. **Type Safety**: TypeScript everywhere, Zod validation, shared types
2. **Shared Utilities**: ALWAYS check/use `@yggdrasil/shared-utilities` first
3. **Security**: bcrypt passwords, JWT tokens, input validation
4. **Clean Code**: DRY, KISS, explain WHY not WHAT

### AuthMiddleware Usage:
```typescript
import { AuthMiddleware } from '@yggdrasil/shared-utilities';

// Basic token verification (fast, no DB lookup)
router.use(AuthMiddleware.verifyToken);

// Token + user lookup (includes user data in req.user)
router.use(AuthMiddleware.verifyTokenWithUserLookup(async (id) => User.findById(id)));

// Role-based access control
router.use(AuthMiddleware.requireRole(['admin', 'staff'])); // Multiple roles
router.use(AuthMiddleware.adminOnly);        // Admin only
router.use(AuthMiddleware.staffOnly);        // Staff only
router.use(AuthMiddleware.teacherAndAbove);  // Teacher, admin, staff

// Complete example for protected route:
router.get('/admin/users', 
  AuthMiddleware.verifyTokenWithUserLookup(async (id) => User.findById(id)),
  AuthMiddleware.adminOnly,
  async (req, res) => {
    // req.user contains authenticated user with role verification
    const users = await User.find();
    return ResponseHelper.success(users);
  }
);
```

## 🏭 Production Standards & Code Quality - CRITICAL LESSONS

### 🎯 **GOLDEN RULE: Fix Infrastructure First, Then Features**

**Phase 2 Success Pattern**:
1. ✅ **TypeScript Strict Mode** - Type safety foundation
2. ✅ **ESLint Integration** - Automated code quality 
3. ✅ **JSDoc Standards** - Documentation consistency
4. ✅ **Pre-commit Hooks** - Quality gates
5. ✅ **Real Testing** - Service validation

**NEVER** add features without this foundation. Every shortcut creates technical debt.

### 🔧 **TypeScript Strict Mode Migration Pattern**

**SYSTEMATIC APPROACH - Follow this exact sequence**:

```typescript
// 1. Fix process.env access FIRST
❌ process.env.NODE_ENV          // Strict mode error
✅ process.env['NODE_ENV']       // Correct bracket notation

// 2. Prefix unused parameters
❌ (req, res) => next()          // 'req' is unused error  
✅ (_req, res) => next()         // Underscore prefix

// 3. Add non-null assertions for validated data
❌ const id = req.params.id;     // string | undefined
✅ const id = req.params.id!;    // Route ensures exists

// 4. Fix exports/imports last
✅ Export missing types from shared-utilities
✅ Update interfaces to match usage
```

**🔥 CRITICAL: Fix shared-utilities FIRST, then cascade to services!**

### 🛠️ **ESLint Production Configuration**

**Working ESLint Setup** (proved successful):

```javascript
// eslint.config.js - START WITH SIMPLE CONFIG
export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['node_modules/', 'dist/', 'coverage/', '*.d.ts'],
    languageOptions: {
      parser: await import('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'error', 
      'no-var': 'error',
      'prefer-const': 'error',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'comma-dangle': ['error', 'always-multiline'],
      'eol-last': 'error',
      'no-trailing-spaces': 'error',
    }
  }
];
```

**⚠️ LESSON: Start simple, expand gradually. Complex configs fail!**

### 📝 **JSDoc Documentation Standards**

**Production JSDoc Pattern**:

```typescript
/**
 * Brief description of what the function does.
 * 
 * Detailed explanation of behavior, edge cases, and important context.
 * Include real-world usage scenarios and security considerations.
 * 
 * @param paramName - Description with type implications
 * @param optionalParam - Optional parameter (include default behavior)
 * @returns Description of return value and possible states
 * 
 * @throws {ErrorType} When specific conditions cause errors
 * 
 * @example
 * ```typescript
 * // Realistic example showing actual usage
 * const result = functionName(realParam, options);
 * if (result.success) {
 *   console.log('Success:', result.data);
 * }
 * ```
 */
```

**🎯 FOCUS: Document WHY, not WHAT. Show real usage patterns.**

### 🔒 **Pre-commit Hook Architecture**

**Bulletproof Pre-commit Setup**:

```json
// package.json
{
  "scripts": {
    "prepare": "husky"
  },
  "lint-staged": {
    "**/*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "**/*.{json,md,yml,yaml}": [
      "prettier --write"  
    ],
    "**/*.ts": [
      "bash -c 'npm run typecheck'"
    ]
  }
}
```

```javascript
// commitlint.config.js - ENFORCE CONVENTIONAL COMMITS
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-min-length': [2, 'always', 10],
    'subject-max-length': [2, 'always', 100],
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor', 
      'test', 'chore', 'security', 'perf', 'ci'
    ]]
  }
};
```

**🛡️ PRINCIPLE: Prevent bad code from entering the repository!**

### 🧪 **Production Testing Philosophy**

**Real-World Testing Requirements**:

```typescript
// ✅ CORRECT: Test real services, real data, real workflows
test('Complete User Journey', async ({ browser }) => {
  const cleanup = TestCleanup.getInstance('Journey Test');
  
  try {
    // Create REAL user with REAL data
    const factory = new TestDataFactory('Test');
    const user = await factory.users.createUser('student');
    cleanup.trackDocument('users', user._id);
    
    // Test REAL authentication flow
    const auth = new CleanAuthHelper(browser, 'Test');
    await auth.loginWithCustomUser(user.email, 'TestPass123!');
    
    // Verify REAL service integration
    await page.goto('/dashboard');
    expect(await page.locator('[data-testid="user-name"]').textContent())
      .toBe(`${user.profile.firstName} ${user.profile.lastName}`);
      
  } finally {
    await cleanup.cleanup(); // MANDATORY
  }
});

// ❌ WRONG: Mock everything
const mockUser = { id: 1, name: 'Test' }; // This teaches nothing!
```

**🎯 CORE RULE: If it doesn't test the real thing, don't write it!**

### 🚨 **Crisis Management Patterns**

**When Services Won't Start** (Phase 2 debugging pattern):

```bash
# 1. Check TypeScript compilation FIRST
npm run typecheck --workspace=@yggdrasil/service-name

# 2. Look for these common patterns:
- process.env.PROPERTY (needs bracket notation)  
- Unused parameters (need underscore prefix)
- Missing exports in shared-utilities
- Type mismatches in interfaces

# 3. Fix in this order:
1. shared-utilities exports
2. process.env access  
3. unused parameters
4. type assertions for validated data

# 4. Test service startup:
npm run test:single -- --grep "Simple Test" --timeout 60000
```

**🔥 EMERGENCY PATTERN: Fix types → Test startup → Fix features**

### 📈 **Success Metrics That Matter**

**Phase 2 Validation Checklist**:

- ✅ **All services start**: `npm run test:single` shows "Clean testing environment shut down!"
- ✅ **Pre-commit works**: Commit with bad code gets rejected
- ✅ **ESLint integrated**: `npm run lint:fix` fixes formatting automatically  
- ✅ **Types enforce safety**: TypeScript strict mode prevents runtime errors
- ✅ **Documentation exists**: Core functions have comprehensive JSDoc

**MEASUREMENT: If you can't commit bad code, you succeeded!**

### 🎓 **Lessons That Must Never Be Forgotten**

1. **Infrastructure before Features**: Never build on broken foundations
2. **Fix Root Cause**: Shared-utilities errors cascade to all services  
3. **Automate Quality**: Humans forget, computers don't
4. **Document Everything**: Future you will thank present you
5. **Test Real Things**: Mocks lie, real data reveals truth
6. **Fail Fast**: Pre-commit rejection is cheaper than production bugs
7. **Start Simple**: Complex configurations break, simple ones work
8. **Measure Success**: If quality isn't measurable, it isn't real

**🌟 GOLDEN INSIGHT: Every manual process will eventually be skipped. Automate or fail.**

### 📚 **API Documentation Standards (OpenAPI/Swagger)**

**CRITICAL: Use OpenAPI for all API documentation**

```typescript
// Always implement OpenAPI documentation for services
import { setupSwagger, createOpenAPIDocument } from '@yggdrasil/shared-utilities';

// In your service app.ts:
if (process.env['NODE_ENV'] !== 'test') {
  const openApiDoc = createServiceOpenAPI();
  setupSwagger(app, openApiDoc);
}
```

**Key Files for Reference**:
- `packages/shared-utilities/src/openapi/setup-swagger.ts` - Swagger setup utilities
- `docs/api/IMPLEMENTATION_GUIDE.md` - Complete implementation guide
- `packages/api-services/auth-service/src/openapi.ts` - Working example

**✅ PATTERNS THAT WORK**:
- Use shared schemas from `@yggdrasil/shared-utilities`
- Add `addCommonResponses()` to all endpoints
- Group endpoints with tags for organization
- Include security requirements for protected routes
- Skip Swagger setup in test environments

**❌ AVOID**:
- Duplicating schemas across services
- Missing security documentation
- Inconsistent response formats

### 🔄 **Console.log Migration Strategy**

**SYSTEMATIC APPROACH - Use the migration script**:

```bash
# Generated script handles intelligent migration
node scripts/migrate-console-logs.js
```

**Script automatically**:
- Maps console.error → logger.error
- Maps console.warn → logger.warn  
- Maps console.log → logger.info
- Maps console.debug → logger.debug
- Adds logger imports where needed
- Creates backup before migration

**KEY LESSONS**:
- Never manually migrate - use the script for consistency
- Script handles 327 statements across 26 files in seconds
- Always create backup (script does this automatically)
- Intelligent log level mapping prevents information loss

### 🧪 **Error Handling Test Patterns**

**COMPREHENSIVE APPROACH - 97 tests across 4 suites**:

```typescript
// Test all error types systematically
describe('AppError Classes', () => {
  // Test each error type: ValidationError, AuthenticationError, etc.
});

describe('ErrorHandler Middleware', () => {
  // Test response formatting, logging, edge cases
});

describe('ErrorMonitor', () => {
  // Test tracking, metrics, spike detection
});

describe('CircuitBreaker', () => {
  // Test states, thresholds, recovery
});
```

**PROVEN PATTERNS**:
- Test error inheritance chains
- Test JSON serialization
- Test edge cases (null errors, circular references)
- Test timing behaviors (circuit breaker timeouts)
- Test real error scenarios, not mocked ones

**FILES TO REFERENCE**:
- `packages/shared-utilities/__tests__/unit/AppError.test.ts`
- `packages/shared-utilities/__tests__/unit/ErrorHandler.test.ts`
- `packages/shared-utilities/__tests__/unit/ErrorMonitor.test.ts`
- `packages/shared-utilities/__tests__/unit/CircuitBreaker.test.ts`

### 🎯 **Next Developer Checklist**

**Before modifying ANY code**:
- [ ] Does `npm run typecheck` pass everywhere?
- [ ] Do pre-commit hooks prevent bad commits?
- [ ] Are new functions documented with JSDoc?
- [ ] Do services start successfully in tests?
- [ ] Is shared-utilities the source of truth?
- [ ] Does new service have OpenAPI documentation at `/api-docs`?
- [ ] Are console.log statements replaced with Winston logging?
- [ ] Are errors handled using AppError hierarchy?
- [ ] Are all tests using real data, not mocks?

**Phase 2 Infrastructure Files (ALWAYS REFERENCE)**:
- `packages/shared-utilities/src/openapi/setup-swagger.ts` - API documentation
- `docs/api/IMPLEMENTATION_GUIDE.md` - OpenAPI implementation guide
- `scripts/migrate-console-logs.js` - Console.log migration
- `packages/shared-utilities/src/errors/` - Error handling patterns
- `packages/shared-utilities/__tests__/unit/` - Comprehensive test examples
- `eslint.config.js` - Working ESLint configuration
- `.husky/` - Pre-commit hooks configuration

**Remember: These standards aren't optional. They're the foundation everything else builds on.**

## 📁 Project Structure
```
packages/
├── frontend/          # Next.js app
├── api-services/      # Express microservices
├── database-schemas/  # Mongoose models
├── shared-utilities/  # Shared code
└── testing-utilities/ # Test infrastructure
```

## 🚀 Quick Reference

**Development**: `npm run dev` → `npm run dev:stop`

**Testing**: `npm run test:quiet` → `npm run test:single -- --grep "Name"`

**Golden Rules**:
- Fix app code, not tests
- Use shared utilities
- Real data only
- Clean up everything
- 45s auth timeouts

**Debugging**: Timeout = add waits | Not found = check loading | Auth fail = check timing

Remember: **Every test failure = real user bug. Fix properly!**