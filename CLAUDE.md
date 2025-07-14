# CLAUDE.md - Development Best Practices for Yggdrasil

> *"Code with the wisdom of the World Tree - structured, interconnected, and ever-growing"*

## 🌳 Project Overview

This is a comprehensive guide for developing the **Yggdrasil Educational Platform**. This document outlines the architectural patterns, coding standards, testing practices, and development workflows that should be followed when working on this project.

## 🏗️ Architecture Overview

### Monorepo Structure
- **Package Manager**: npm workspaces
- **Build Tool**: TypeScript compiler with Next.js for frontend
- **Containerization**: Docker for development and deployment
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with refresh token strategy

### Service Architecture - Keep It Simple
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
- **Controllers**: Handle HTTP requests/responses only
- **Services**: Contain business logic and data transformation
- **Models**: Database entity definitions with methods
- **Utilities**: Pure functions for common operations

### 2. **Type Safety First**
- All code must be written in TypeScript
- No `any` types except for legacy code migration
- Use Zod for runtime validation and type inference
- Leverage shared types from `@shared/types`

### 3. **Error Handling**
- Always return structured error responses using `ResponseHelper`
- Use HTTP status codes consistently
- Log errors appropriately but never expose sensitive information
- Validate all inputs at the controller level

### 4. **Security by Design**
- Never commit secrets or credentials to version control
- Use environment variables for all configuration
- Implement proper authentication middleware
- Validate and sanitize all user inputs
- Use bcrypt for password hashing

### 5. **Minimal Dependencies & Simplicity**
- **Minimize library usage**: Use built-in solutions when possible
- **Avoid over-engineering**: Don't add complexity without clear benefit
- **Question every dependency**: Ask "Can we do this with vanilla JS/TS?"
- **Bundle size matters**: Every dependency impacts performance
- **Maintenance burden**: Fewer dependencies = less security vulnerabilities

#### Examples of Minimal Dependency Approach
```typescript
// ❌ BAD: Adding library for simple operations
import _ from 'lodash';
const uniqueEmails = _.uniq(users.map(u => u.email));

// ✅ GOOD: Use native JavaScript
const uniqueEmails = [...new Set(users.map(u => u.email))];

// ❌ BAD: Heavy date library for simple operations
import moment from 'moment';
const isRecent = moment(date).isAfter(moment().subtract(7, 'days'));

// ✅ GOOD: Native Date handling
const isRecent = (new Date() - new Date(date)) < 7 * 24 * 60 * 60 * 1000;

// ❌ BAD: Library for simple validation
import validator from 'validator';
const isValidEmail = validator.isEmail(email);

// ✅ GOOD: Simple regex (if complexity is low)
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
```

#### When TO Use Libraries (Smart Choices)
```typescript
// ✅ GOOD: Complex tasks that benefit from libraries
import bcrypt from 'bcrypt';        // Security-critical hashing
import jwt from 'jsonwebtoken';     // Standard token handling
import mongoose from 'mongoose';    // Database abstraction with real value
import zod from 'zod';             // Complex validation schemas

// ✅ GOOD: Framework-specific utilities
import { NextRequest } from 'next/server';  // Next.js types
import { Request, Response } from 'express'; // Express types
```

#### Library Evaluation Checklist
Before adding any dependency, ask:
- [ ] Can this be done with 20 lines of vanilla JS/TS?
- [ ] Does this library solve a genuinely complex problem?
- [ ] Is the library actively maintained and secure?
- [ ] Will this library still be relevant in 2 years?
- [ ] Does the benefit outweigh the bundle size cost?

### 6. **Clean Code Principles**

#### DRY (Don't Repeat Yourself)
```typescript
// ❌ BAD: Repeated validation logic
class AuthController {
  async register(req: Request, res: Response) {
    if (!req.body.email || !req.body.email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    // ... registration logic
  }
  
  async updateEmail(req: Request, res: Response) {
    if (!req.body.email || !req.body.email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    // ... update logic
  }
}

// ✅ GOOD: Extracted validation function
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

class AuthController {
  async register(req: Request, res: Response) {
    if (!validateEmail(req.body.email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    // ... registration logic
  }
}
```

#### KISS (Keep It Simple, Stupid)
```typescript
// ❌ BAD: Overly complex solution
const getUserAge = (user: User): number => {
  const birthDate = new Date(user.birthDate);
  const now = new Date();
  const yearsDiff = now.getFullYear() - birthDate.getFullYear();
  const monthsDiff = now.getMonth() - birthDate.getMonth();
  const daysDiff = now.getDate() - birthDate.getDate();
  
  if (monthsDiff < 0 || (monthsDiff === 0 && daysDiff < 0)) {
    return yearsDiff - 1;
  }
  return yearsDiff;
};

// ✅ GOOD: Simple and clear
const getUserAge = (birthDate: Date): number => {
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear = 
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  
  return hasHadBirthdayThisYear ? age : age - 1;
};
```

#### SOLID Principles
```typescript
// Single Responsibility Principle
// ❌ BAD: Class doing too many things
class UserService {
  createUser() { /* ... */ }
  sendEmail() { /* ... */ }
  generateReport() { /* ... */ }
  uploadFile() { /* ... */ }
}

// ✅ GOOD: Separated concerns
class UserService {
  createUser() { /* ... */ }
}

class EmailService {
  sendEmail() { /* ... */ }
}

class ReportService {
  generateReport() { /* ... */ }
}
```

## 📏 Code Standards

### File Organization
```typescript
// Service file structure - keep it flat and simple
src/
├── controllers/          # HTTP request handlers
├── services/            # Business logic
├── middleware/          # Request/response middleware
├── routes/              # Route definitions
├── types/               # Service-specific types
└── index.ts            # Service entry point
```

### Naming Conventions
- **Files**: PascalCase for components, camelCase for utilities
- **Classes**: PascalCase (`AuthService`, `UserController`)
- **Functions**: camelCase (`getUserById`, `validateEmail`)
- **Variables**: camelCase (`userEmail`, `isAuthenticated`)
- **Constants**: UPPER_SNAKE_CASE (`HTTP_STATUS`, `JWT_SECRET`)
- **Interfaces**: PascalCase with descriptive names (`AuthResult`, `UserData`)

### Comments - Write Like a Senior Developer
```typescript
// ❌ BAD: Useless comments that repeat the code
// Get user by id
const getUserById = (id: string) => {
  // Return user
  return users.find(u => u.id === id);
};

// ✅ GOOD: Comments that explain WHY, not WHAT
export class AuthService {
  /**
   * Validates user credentials and generates JWT tokens.
   * Uses bcrypt for password comparison to prevent timing attacks.
   * Returns both access and refresh tokens for security.
   */
  static async login(email: string, password: string): Promise<AuthResult> {
    const user = await UserModel.findByEmail(email);
    
    // Early return to prevent user enumeration attacks
    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Bcrypt handles timing-safe comparison internally
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      // Log failed attempts for security monitoring
      await SecurityService.logFailedAttempt(email);
      return { success: false, error: 'Invalid credentials' };
    }

    // Generate tokens with different expiration times
    // Access token: short-lived for API calls
    // Refresh token: long-lived for session management
    const tokens = AuthHelper.generateTokens(user);
    
    return { success: true, user, tokens };
  }
}
```

## 🧪 Testing Philosophy - Smart & Minimal

### The Core Principle: Test What Can Actually Break

**We only write tests for code that could realistically fail or has business logic complexity.**

#### ✅ WHAT TO TEST (High Value)

1. **Business Logic & Complex Algorithms**
   ```typescript
   // ✅ TEST THIS: Authentication logic with multiple conditions
   AuthService.login() // Has validation, database calls, token generation
   
   // ✅ TEST THIS: Password validation with complex rules
   ValidationHelper.isValidPassword() // Multiple regex checks, error conditions
   
   // ✅ TEST THIS: JWT token operations
   JWTHelper.verifyToken() // Complex verification, error handling
   ```

2. **Data Transformations & Calculations**
   ```typescript
   // ✅ TEST THIS: User model transformations
   UserDocument.toJSON() // Removes sensitive data, transforms IDs
   
   // ✅ TEST THIS: Complex validation logic
   ValidationHelper.validate() // Schema validation with error mapping
   ```

3. **Edge Cases & Error Conditions**
   ```typescript
   // ✅ TEST THIS: What happens with invalid inputs?
   AuthService.login({ email: "", password: "" })
   
   // ✅ TEST THIS: What happens when database fails?
   AuthService.register() // Database constraint violations
   
   // ✅ TEST THIS: What happens with expired tokens?
   JWTHelper.verifyAccessToken(expiredToken)
   ```

#### ❌ WHAT NOT TO TEST (Low Value)

1. **Framework & Library Code**
   ```typescript
   // ❌ DON'T TEST: Express route handlers (just call services)
   app.post('/login', (req, res) => AuthService.login(req.body))
   
   // ❌ DON'T TEST: Mongoose schema definitions
   const userSchema = new Schema({ email: String })
   
   // ❌ DON'T TEST: Simple getters/setters
   getAccessToken() // Just returns a cookie value
   ```

2. **External API Calls**
   ```typescript
   // ❌ DON'T TEST: HTTP client wrappers
   authApi.login() // Just calls axios.post()
   
   // ❌ DON'T TEST: Database queries without logic
   UserModel.findById() // Mongoose built-in method
   ```

3. **Trivial Operations**
   ```typescript
   // ❌ DON'T TEST: Simple assignments
   user.lastLogin = new Date()
   
   // ❌ DON'T TEST: Basic string operations
   email.toLowerCase().trim()
   ```

### Testing Levels - Two Types Only

#### 1. **Unit Tests** - Test Individual Functions in Isolation
- **Purpose**: Verify business logic, edge cases, error handling
- **Scope**: Single function/method with mocked dependencies
- **Speed**: Very fast (< 100ms per test)
- **Focus**: Pure functions, calculations, validations

```typescript
// Unit Test Example
describe('JWTHelper.verifyAccessToken', () => {
  it('should return success for valid token', () => {
    const result = JWTHelper.verifyAccessToken(validToken);
    expect(result.success).toBe(true);
  });
  
  it('should return error for expired token', () => {
    const result = JWTHelper.verifyAccessToken(expiredToken);
    expect(result.success).toBe(false);
    expect(result.error).toContain('expired');
  });
});
```

#### 2. **Functional Tests** - Test Complete User Workflows
- **Purpose**: Verify end-to-end business processes through browser automation
- **Scope**: Full user journeys from frontend UI to backend APIs
- **Speed**: Slower (5-30 seconds per test)
- **Focus**: Real user scenarios, browser interactions, complete workflows
- **Technology**: Playwright for browser automation

```typescript
// Functional Test Example - Browser automation
test('User can login with demo account', async ({ page }) => {
  await page.goto('/auth/login');
  await page.click('button:has-text("Admin Account")');
  await expect(page).toHaveURL('/dashboard');
});
```

**Functional Test Features:**
- **Real Browser Testing**: Tests run against actual running dev servers
- **Auto Server Startup**: Playwright automatically starts frontend (port 3000) and backend (port 3001)
- **User Journey Testing**: Tests complete workflows like login → dashboard → logout
- **Visual Validation**: Verifies UI elements, error messages, and user feedback
- **Cross-Service Testing**: Validates frontend ↔ backend communication

### Test Quality Standards

#### Write Tests That Find Real Bugs

```typescript
// ❌ BAD: Tests implementation, not behavior
it('should call bcrypt.hash', () => {
  const spy = jest.spyOn(bcrypt, 'hash');
  AuthService.register(userData);
  expect(spy).toHaveBeenCalled(); // WHO CARES?
});

// ✅ GOOD: Tests actual requirement
it('should never store plaintext passwords', async () => {
  const userData = { password: 'plaintext123' };
  await AuthService.register(userData);
  
  const user = await UserModel.findByEmail(userData.email);
  expect(user.password).not.toBe('plaintext123'); // ACTUAL SECURITY REQUIREMENT
  expect(user.password).toMatch(/^\$2[aby]\$/); // Verify bcrypt format
});
```

#### Test Error Conditions (Most Important!)

```typescript
// ✅ EXCELLENT: Test what happens when things go wrong
describe('AuthService.login - Error Conditions', () => {
  it('should reject inactive users', async () => {
    const user = await createUser({ isActive: false });
    const result = await AuthService.login({ email: user.email, password: 'correct' });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('deactivated');
  });
  
  it('should handle database connection failures', async () => {
    jest.spyOn(UserModel, 'findByEmail').mockRejectedValue(new Error('DB Error'));
    
    const result = await AuthService.login(validLoginData);
    expect(result.success).toBe(false);
    expect(result.error).toBe(ERROR_MESSAGES.INTERNAL_ERROR);
  });
});
```

### Test Organization & Naming

#### File Structure
```
packages/
├── auth-service/
│   ├── src/
│   │   ├── services/AuthService.ts
│   │   └── utils/JWTHelper.ts
│   └── __tests__/
│       ├── unit/
│       │   ├── AuthService.test.ts      # Unit tests
│       │   └── JWTHelper.test.ts
│       └── functional/
│           └── auth-flow.test.ts        # End-to-end workflows
```

#### Test Naming Convention
```typescript
// Pattern: should [expected result] when [condition]
describe('AuthService.login', () => {
  it('should return user data when credentials are valid', () => {});
  it('should reject login when user is inactive', () => {});
  it('should reject login when password is incorrect', () => {});
  it('should handle database errors gracefully', () => {});
});
```

### Test Commands

```bash
# Run all tests with summary output (recommended for quick feedback)
npm run test:summary

# Run unit tests only (fast feedback)
npm run test:unit

# Run functional tests (browser automation against running dev servers)
npm run test:functional

# Run all tests (verbose output)
npm test
```

**Recommendation**: Use `npm run test:summary` for regular development to avoid verbose console output and focus on actual failures.

**Functional Test Scenarios:**
- **Login Success**: Demo account logins, manual form entry, UI validation
- **Login Failure**: Invalid credentials, empty fields, form validation
- **Account Creation**: New user registration, field validation, role selection

**Prerequisites for Functional Tests:**
- Functional tests automatically clear ports and start dev servers
- Tests run against `localhost:3000` (frontend) and `localhost:3001` (auth service)
- Demo accounts must exist: admin@yggdrasil.edu, teacher@yggdrasil.edu, student@yggdrasil.edu

**Port Management:**
- All dev commands automatically clear ports before starting (3000-3005)
- Use `node scripts/kill-ports.js [port1] [port2]` to manually clear specific ports
- Use `npm run dev:clean` if you need to force clear all ports

## 🔴 Test-Driven Development (TDD) Best Practices

### TDD Philosophy: Red → Green → Refactor

**Test-Driven Development is the practice of writing tests BEFORE writing implementation code.**

#### The TDD Cycle
```
🔴 RED: Write a failing test
🟢 GREEN: Write minimal code to make it pass  
🔵 REFACTOR: Clean up code while keeping tests green
```

### When to Use TDD

#### ✅ **HIGHLY RECOMMENDED for TDD:**

1. **Business Logic & Complex Algorithms**
   ```typescript
   // ✅ Perfect for TDD
   describe('PasswordValidator', () => {
     it('should reject passwords shorter than 8 characters', () => {
       // Write this test FIRST, watch it fail
       expect(PasswordValidator.isValid('short')).toBe(false);
     });
   });
   
   // Then implement the minimal code to make it pass
   ```

2. **API Endpoints & Controllers**
   ```typescript
   // ✅ TDD for new endpoints
   describe('POST /api/auth/register', () => {
     it('should return 400 for invalid email', async () => {
       const response = await request(app)
         .post('/api/auth/register')
         .send({ email: 'invalid', password: 'Valid123!' });
       
       expect(response.status).toBe(400);
     });
   });
   ```

3. **Bug Fixes (Critical for TDD)**
   ```typescript
   // ✅ ALWAYS write failing test for bug first
   it('should handle user logout when session expired', () => {
     // Reproduce the bug in a test first
     // Then fix the code to make test pass
   });
   ```

4. **Utilities & Helper Functions**
   ```typescript
   // ✅ Perfect TDD candidate
   describe('DateHelper.formatRelativeTime', () => {
     it('should return "2 hours ago" for date 2 hours in past', () => {
       const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
       expect(DateHelper.formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
     });
   });
   ```

#### ⚠️ **OPTIONAL TDD (Use Judgment):**

- **React Components**: TDD for complex logic, skip for simple UI
- **Database Models**: TDD for validation logic, skip for basic CRUD
- **Configuration**: Usually not worth TDD

#### ❌ **SKIP TDD FOR:**

- **Exploratory Code**: When you're not sure what you're building
- **Prototype/Spike Work**: Quick experiments and proof of concepts  
- **Simple CRUD Operations**: Basic database queries without logic
- **Third-party Integrations**: Focus on integration tests instead

### TDD Best Practices

#### 1. **Write the Smallest Possible Failing Test**
```typescript
// ❌ BAD: Testing too much at once
it('should register user, send email, log event, and return tokens', () => {
  // Too many responsibilities in one test
});

// ✅ GOOD: One specific behavior
it('should return validation error for missing email', () => {
  const result = AuthService.register({ password: 'Valid123!' });
  expect(result.success).toBe(false);
  expect(result.error).toContain('email');
});
```

#### 2. **Make Tests Pass with Minimal Code**
```typescript
// Test written first:
it('should return true for valid email format', () => {
  expect(EmailValidator.isValid('user@example.com')).toBe(true);
});

// ✅ GOOD: Minimal implementation
export class EmailValidator {
  static isValid(email: string): boolean {
    return email.includes('@'); // Start simple!
  }
}

// ❌ BAD: Over-engineering from the start
export class EmailValidator {
  static isValid(email: string): boolean {
    // Complex regex, multiple validations, etc.
    // Build complexity gradually through more tests!
  }
}
```

#### 3. **Refactor Fearlessly with Test Safety Net**
```typescript
// After tests pass, refactor confidently
export class EmailValidator {
  static isValid(email: string): boolean {
    // Now add proper email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
// Tests still pass ✅
```

#### 4. **Test Behavior, Not Implementation**
```typescript
// ❌ BAD: Testing implementation details
it('should call bcrypt.hash with salt rounds 12', () => {
  // Don't test HOW, test WHAT
});

// ✅ GOOD: Testing behavior  
it('should never store plain text passwords', async () => {
  await AuthService.register({ email: 'test@example.com', password: 'plain123' });
  const user = await UserModel.findByEmail('test@example.com');
  expect(user.password).not.toBe('plain123');
  expect(user.password).toMatch(/^\$2[aby]\$/); // Verify it's hashed
});
```

### TDD for Different Layers

#### **Backend TDD Workflow**
```typescript
// 1. Write failing controller test
describe('AuthController.register', () => {
  it('should return 201 for valid registration', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(validUserData);
    expect(response.status).toBe(201);
  });
});

// 2. Implement minimal controller
// 3. Write failing service test  
// 4. Implement minimal service
// 5. Refactor both layers
```

#### **Frontend TDD Workflow**
```typescript
// 1. Write failing component test
describe('LoginForm', () => {
  it('should show error when password is empty', () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByText('Login'));
    expect(screen.getByText('Password is required')).toBeVisible();
  });
});

// 2. Implement minimal component logic
// 3. Add validation behavior
// 4. Refactor component structure
```

### TDD Anti-Patterns to Avoid

#### ❌ **Testing Everything (Analysis Paralysis)**
```typescript
// Don't TDD simple getters/setters
class User {
  getName() { return this.name; } // Skip TDD for this
}
```

#### ❌ **Writing Tests After Code (Not TDD)**
```typescript
// This is just "adding tests", not TDD
// TDD means test FIRST, then code
```

#### ❌ **Overly Complex Test Setup**
```typescript
// ❌ BAD: Complex setup obscures intent
beforeEach(async () => {
  // 50 lines of setup
});

// ✅ GOOD: Simple, focused setup
it('should validate email format', () => {
  // Simple, clear test
});
```

### TDD Success Metrics

#### ✅ **Good TDD Indicators:**
- Tests written before implementation code
- Small, frequent commits (Red → Green → Refactor)
- High confidence in refactoring
- Clear, focused test descriptions
- Minimal code to make tests pass

#### 🚩 **TDD Warning Signs:**
- Writing all tests after implementation
- Tests that are hard to understand
- Over-engineered solutions from the start
- Fear of changing existing code
- Tests that break when refactoring

### TDD Integration with CI/CD

```bash
# TDD-friendly development workflow
git checkout -b feature/user-password-reset

# 1. Write failing test
git add test/ && git commit -m "red: add failing test for password reset"

# 2. Make test pass
git add src/ && git commit -m "green: implement basic password reset"  

# 3. Refactor
git add . && git commit -m "refactor: extract email validation logic"

# 4. Repeat cycle
```

### When to Write Tests

#### ✅ WRITE TESTS FOR:
- New business logic functions
- Bug fixes (write failing test first)
- Complex validations or transformations
- Security-critical code (authentication, permissions)
- Functions with multiple conditional branches

#### ⏭️ SKIP TESTS FOR:
- Simple CRUD operations
- Straightforward API wrappers
- Basic getters/setters
- Configuration files
- Type definitions

### Red Flags: Tests That Waste Time

```typescript
// 🚩 RED FLAG: Testing framework functionality
it('should render component', () => {
  render(<LoginForm />);
  expect(screen.getByText('Login')).toBeInTheDocument(); // React already guarantees this
});

// 🚩 RED FLAG: Testing dependencies
it('should use bcrypt for hashing', () => {
  // Testing that bcrypt works is bcrypt's responsibility
});

// 🚩 RED FLAG: Testing mocks
it('should call mock function', () => {
  mockFunction.mockReturnValue(true);
  expect(mockFunction).toHaveBeenCalled(); // You're just testing your own mock
});
```

**Remember**: Every test has a maintenance cost. Only write tests that provide real value by catching actual bugs that could happen in production.

## 🔧 Development Workflow

### Setting Up Development Environment
```bash
# Install dependencies
npm install

# Setup database
npm run setup:db

# Start development servers
npm run dev

# Or start individual services
npm run dev:frontend    # Frontend at :3000
npm run dev:services    # All services at :3001+
```

### Git Workflow
```bash
# Feature branch naming
git checkout -b feature/user-authentication
git checkout -b fix/login-validation-bug
git checkout -b docs/update-api-documentation

# Commit message format
git commit -m "feat: add user registration with email verification"
git commit -m "fix: resolve password validation edge case"
git commit -m "docs: update API documentation for auth endpoints"
```

### Code Quality Commands
```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run typecheck

# Build all packages
npm run build
```

## 📊 Code Quality Standards

### Code Review Checklist
- [ ] All functions have proper TypeScript types
- [ ] Error handling is implemented consistently
- [ ] Input validation is performed at boundaries
- [ ] No hardcoded secrets or sensitive data
- [ ] Code follows DRY, KISS, and SOLID principles
- [ ] **New dependencies are justified and minimal**
- [ ] **Could vanilla JS/TS be used instead of new libraries?**
- [ ] Comments explain WHY, not WHAT
- [ ] Documentation is updated if needed

#### TDD-Specific Review Checklist
- [ ] **Tests written BEFORE implementation code (if using TDD)**
- [ ] **Each test focuses on one specific behavior**
- [ ] **Implementation is minimal code to make tests pass**
- [ ] **Test names clearly describe expected behavior**
- [ ] **Tests are independent and can run in any order**
- [ ] **No over-engineering beyond current test requirements**
- [ ] **Refactoring preserves all existing test behavior**

## 🚀 Performance Best Practices

### Backend Performance
- Use MongoDB indexing for frequently queried fields
- Implement caching for expensive operations
- Use connection pooling for database connections
- Implement rate limiting for API endpoints

### Frontend Performance
- Implement code splitting with Next.js dynamic imports
- Use React.memo for expensive components
- Optimize images with Next.js Image component
- Use SWR for data fetching and caching

## 🔒 Security Guidelines

### Authentication & Authorization
- Always use JWT tokens with reasonable expiration times
- Implement refresh token rotation
- Use proper RBAC (Role-Based Access Control)
- Validate tokens on every protected route

### Data Protection
- Never log sensitive user data
- Use HTTPS in production environments
- Implement proper CORS configuration
- Sanitize all user inputs

## 🌟 Best Practices Summary

### The 10 Commandments of Yggdrasil Development

1. **Type Everything**: TypeScript is your friend
2. **Keep It Simple**: KISS > clever code, minimize dependencies
3. **Don't Repeat Yourself**: Extract common logic
4. **Question Every Dependency**: Can we do this with vanilla JS/TS?
5. **Test First When Possible**: TDD for business logic and bug fixes
6. **Comment the WHY**: Code shows how, comments show why
7. **Handle Errors Gracefully**: Users deserve good error messages
8. **Secure by Default**: Never trust user input
9. **Review Before Merge**: Four eyes are better than two
10. **Document Changes**: Update docs with code changes

## 🎯 Quick Reference Commands

```bash
# Development
npm run dev                 # Start all services (clears ports automatically)
npm run dev:clean           # Force clear all ports, then start services
npm run dev:frontend        # Frontend only
npm run dev:services        # Backend services only

# Testing (TDD-Ready)
npm run test:summary       # Run all tests (summary output - recommended for TDD)
npm test                   # Run all tests (verbose output)
npm run test:unit          # Fast unit tests only (perfect for TDD red-green-refactor)
npm run test:functional    # Browser automation tests (for integration validation)
npm run test:watch         # Continuous testing for TDD workflow

# Code Quality
npm run lint                # Check code style
npm run lint:fix           # Fix linting issues
npm run typecheck          # TypeScript checking

# Database
npm run setup:db           # Initialize database
npm run migrate            # Run migrations
npm run seed               # Seed test data

# Build & Deploy
npm run build              # Build for production
npm run start              # Start production server
```

---

*"May your code be as enduring and interconnected as the roots of Yggdrasil itself."* 🌳

**Remember**: 
- This is a living document. Update it as the project evolves.
- Always prioritize code quality over speed of delivery.
- If you can't explain it simply, you don't understand it well enough.

