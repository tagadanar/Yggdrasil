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

## 🧪 Testing Philosophy - FIX THE APP, NOT THE TEST

### 🚨 THE GOLDEN RULE
**When a test fails, the application has a bug. Fix the root cause in the application code, NEVER modify the test to pass.**

### 📋 Mandatory Test Workflow

```bash
# 1. OVERVIEW - Run all tests (2-3 minutes with 4 workers)
npm run test:quiet

# 2. FOCUS - Debug ONE failing test at a time
npm run test:single -- --grep "specific test name"

# 3. FIX - Modify application code (NOT test code)

# 4. VERIFY - Run the single test again

# 5. REPEAT - Back to step 1 until 100% pass
```

### ⚡ Testing Best Practices

**✅ ALWAYS:**
- Run `test:quiet` first for overview
- Work on ONE test at a time
- Fix the root cause in app code
- Wait for tests to complete naturally
- Read error messages carefully
- Check browser screenshots/traces on failure

**❌ NEVER:**
- Skip or disable failing tests
- Modify tests to make them pass
- Add arbitrary waits without understanding why
- Interrupt test execution prematurely
- Test manually instead of using the suite
- Assume a test is "flaky" - find the real issue

### 🎯 Current Test Architecture
- **32 functional tests** covering all user workflows
- **4-worker parallelization** with complete isolation
- **Enhanced isolation system** - each test gets fresh data
- **Automatic service management** via Playwright

## 🏗️ Development Principles

### 1. Type Safety First
- TypeScript everywhere, no `any` types
- Zod for runtime validation
- Shared types from `@yggdrasil/shared-utilities`

### 2. Shared Utilities Pattern
- Use `SharedJWTHelper` for JWT operations
- Use `ResponseHelper` for API responses  
- Centralize common logic in shared-utilities
- Never duplicate code across services

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
# Testing
npm run test:quiet          # All tests with 4 workers
npm run test:single         # Debug single test
npm run test:debug          # Run with browser UI

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

1. **Run tests**: `npm run test:quiet`
2. **Debug failures**: `npm run test:single -- --grep "failing test"`
3. **Fix app code**: Never modify tests to pass
4. **Verify fix**: Re-run the single test
5. **Confirm all pass**: `npm run test:quiet` again

## 💡 Debugging Tips

- **Timeout errors**: Service is slow, not broken - add proper waits
- **Element not found**: Check for dynamic loading, wait for elements
- **Auth failures**: Token expiry or race condition - check timing
- **Flaky tests**: There's always a root cause - investigate thoroughly

Remember: **Every test failure represents a real user-facing bug. Fix it properly.**