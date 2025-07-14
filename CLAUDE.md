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
└── testing-utilities/     # Test setup and utilities
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

### 5. **Minimal Dependencies & Simplicity**
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

## 🧪 Testing & TDD - Smart & Minimal

### CORE PRINCIPLE: Test What Can Actually Break
**ONLY write tests for code with business logic complexity or realistic failure potential.**

### 🚨 CRITICAL DEBUGGING PROTOCOL

**NEVER create temporary files, manual curl commands, or workarounds. ALWAYS use the test suite.**

#### ✅ MANDATORY DEBUGGING WORKFLOW:
1. **Run test suite first**: `npm run test:functional` or `npm run test:unit`
2. **Read failures carefully**: They show exactly what's broken
3. **Fix application code**: Don't fix tests to pass, fix the app
4. **Verify with tests**: Ensure fix works

#### 🎯 FUNCTIONAL TESTS = ENVIRONMENT TRUTH
- **Unit tests**: Use mocks, can pass when environment broken
- **Functional tests**: Hit real services, reveal configuration issues
- **RULE**: If functional tests pass, environment works. If they fail, they show exactly what to fix.

### 🚨 CRITICAL: Service Management for Functional Tests

**NEVER manually start services for testing. ALWAYS use the service manager to prevent infrastructure chaos.**

#### ⚡ Service Management Commands
```bash
# ✅ CORRECT: Use these commands ONLY
npm run test:services:clean    # Clean ports before testing
npm run test:services:start    # Start services for manual testing  
npm run test:services:stop     # Stop all services
npm run test:services:health   # Check service status
npm run test:functional        # Automated tests (manages services automatically)

# ❌ NEVER DO: Manual service commands during testing
npm run dev                    # OLD WAY - Creates port conflicts
node wait-for-services.js      # REMOVED - Deprecated, causes chaos  
killall node                   # Crude, breaks other work
npx concurrently               # OLD WAY - Use service manager instead
```

#### 🛡️ Service Management Rules
- **ONE INSTANCE ONLY**: Service manager prevents multiple service instances
- **AUTO CLEANUP**: Tests automatically start/stop services via Playwright
- **FRESH ENVIRONMENT**: Each test run gets clean services (no `reuseExistingServer`)
- **PORT PROTECTION**: Automatic port conflict detection and cleanup
- **LOCK FILE SYSTEM**: Prevents duplicate service managers running simultaneously

#### 🚑 Emergency Recovery
If you encounter port conflicts or service chaos:
```bash
npm run test:services:clean    # This fixes 99% of issues
npm run test:services:health   # Verify everything is clean
```

**CRITICAL**: If someone breaks this system, they must fix it immediately - functional tests are the source of truth for the entire platform.

### Testing Levels - Two Types Only

#### 1. **Unit Tests** - Individual Functions (< 100ms)
- **Test**: Business logic, edge cases, error handling
- **Focus**: Pure functions, calculations, validations

#### 2. **Functional Tests** - Complete User Workflows (5-30s)
- **Test**: End-to-end browser automation via Playwright
- **Focus**: Real user scenarios, UI interactions, service integration

### ✅ WHAT TO TEST (High Value)
- **Business Logic**: `AuthService.login()`, password validation, JWT operations
- **Data Transformations**: User model transformations, validation logic
- **Edge Cases**: Invalid inputs, database failures, expired tokens

### ❌ WHAT NOT TO TEST (Low Value)
- **Framework Code**: Express routes, Mongoose schemas, simple getters
- **External APIs**: HTTP wrappers, basic database queries
- **Trivial Operations**: Assignments, basic string operations

### TDD Best Practices - Red → Green → Refactor

#### ✅ USE TDD FOR:
- **Business Logic**: Complex algorithms, validation rules
- **API Endpoints**: New controller methods  
- **Bug Fixes**: ALWAYS write failing test first
- **Utilities**: Helper functions with multiple branches

#### ❌ SKIP TDD FOR:
- **Exploratory Code**: Uncertain requirements
- **Simple CRUD**: Basic database operations
- **Integrations**: Third-party API wrappers

#### TDD Workflow
```typescript
// 1. Write smallest failing test
it('should reject passwords shorter than 8 characters', () => {
  expect(PasswordValidator.isValid('short')).toBe(false);
});

// 2. Minimal implementation
static isValid(pwd: string) { return pwd.length >= 8; }

// 3. Refactor when tests pass
```

### Test Commands
```bash
# Daily development (recommended)
npm run test:summary       # Quick feedback, summary output
npm run test:unit          # Fast unit tests (TDD workflow)
npm run test:functional    # Browser automation (environment validation)

# Debugging functional tests
npm run test:functional:quiet          # Overview of failures
npm run test:functional:single -- --grep "login"  # Specific test debugging
```

## 🔧 Development Workflow

### Environment Setup
```bash
npm install                # Dependencies
npm run setup:db          # Database
npm run dev               # All services (foreground mode)
```

### 🚨 CRITICAL: Proper Development Server Usage

**✅ CORRECT - New Service Manager:**
```bash
npm run dev               # Managed services with automatic cleanup
npm run dev:clean         # Clean ports, then start services
npm run dev:stop          # Stop all services gracefully
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
- **If stuck**: `node scripts/kill-ports.js 3000 3001 3002`

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
- [ ] Consistent error handling via `ResponseHelper`
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

## 🎯 Quick Reference Commands

```bash
# Development (New Service Manager)
npm run dev                 # All services via service manager (auto-cleanup)
npm run dev:clean           # Clean ports and start services
npm run dev:stop            # Stop all services gracefully
npm run dev:health          # Check service health status

# Testing (TDD-Ready)
npm run test:summary       # Recommended for TDD (summary output)
npm run test:unit          # Fast feedback (red-green-refactor)
npm run test:functional    # Environment validation
npm run test:watch         # Continuous testing

# Quality & Build
npm run lint               # Code style check
npm run typecheck          # TypeScript validation
npm run build              # Production build
npm run setup:db           # Database setup
npm run seed               # Test data
```

---

**Remember**: This is a living document. Always prioritize code quality over delivery speed. If you can't explain it simply, you don't understand it well enough.