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

### Test Suites (8 categories, 40+ tests):
- **Authentication Security** [CRITICAL]: JWT, sessions, auth
- **User Management** [HIGH]: CRUD, validation
- **Course Management** [HIGH]: Educational workflows
- **News/Planning/Platform** [MEDIUM]: Features
- **Statistics Management** [MEDIUM]: Analytics & reporting
- **System Integration** [HIGH]: E2E workflows

### Individual Test Examples:
```bash
# Debug specific tests directly
npm run test:single -- --grep "Complete JWT Security Lifecycle"
npm run test:single -- --grep "Should handle complete user creation workflow"
npm run test:single -- --grep "Complete Course Creation"
npm run test:single -- --grep "Complete article lifecycle"
npm run test:single -- --grep "Complete Student Learning Journey"
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