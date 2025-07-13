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

## 🧪 Testing Philosophy & TDD Best Practices

### Test Output Philosophy - Keep It Clean

#### The Golden Rules of Test Output
1. **General test output should NOT be too verbose**
2. **Use full test suite run to list issues and get overview**
3. **Run individual tests to look at detailed error logs**

#### Practical Test Execution Strategy

```bash
# ✅ RECOMMENDED: Clean overview of all test results
npm run test:summary         # Shows passed/failed count, lists only failures
npm run test:quiet           # Minimal output, just pass/fail status

# ✅ GOOD: Quick check during development
npm run test:unit --silent   # Unit tests only, minimal noise
npm run test:changed         # Only test changed files

# ❌ AVOID: Verbose output for full suite (information overload)
npm test                     # Too much output for large codebases
npm test --verbose           # Overwhelming amount of information

# ✅ PERFECT: Detailed output for specific failing tests
npm test -- AuthService.test.ts --verbose    # Detailed logs for one test file
npm test -- --testNamePattern="login"        # Focus on specific test
```

#### Example Output Comparison

**❌ BAD: Verbose full suite output (information overload)**
```bash
$ npm test
PASS  src/auth/AuthService.test.ts (7.234s)
  AuthService
    ✓ should create user (234ms)
    ✓ should validate email (12ms)
    ✓ should hash password (156ms)
    ... (50 more lines of passing tests)
PASS  src/user/UserService.test.ts (5.123s)
  UserService  
    ✓ should update profile (89ms)
    ... (another 40 lines)
FAIL  src/course/CourseService.test.ts (2.456s)
  CourseService
    ✓ should create course (45ms)
    ✗ should validate course data (23ms)
      Expected: "valid"
      Received: "invalid"
    ... (buried among 200+ lines of output)
```

**✅ GOOD: Clean summary output**
```bash
$ npm run test:summary
🧪 Test Summary
================
✅ Passed: 147/150 tests
❌ Failed: 3 tests

📋 Failed Tests:
• CourseService › should validate course data
• PaymentService › should process refund  
• NotificationService › should send email

💡 Run individual tests with: npm test -- <TestName> --verbose
```

**✅ PERFECT: Detailed output for specific test**
```bash
$ npm test -- CourseService.test.ts --verbose
FAIL  src/course/CourseService.test.ts
  CourseService
    ✗ should validate course data (23ms)
    
      ValidationError: Course title is required
      
      expect(received).toBe(expected) // Object.is equality
      
      Expected: "valid"
      Received: "invalid"
      
        at Object.<anonymous> (CourseService.test.ts:45:23)
        
      Course data: { description: "test", duration: 120 }
      Validation result: { valid: false, errors: ["title is required"] }
```

#### Testing Workflow Best Practices

```bash
# 1. DEVELOPMENT WORKFLOW
# Start with overview to see what's broken
npm run test:summary

# Focus on specific failing area  
npm test -- AuthService --watch

# Check integration after fixes
npm run test:integration

# 2. DEBUGGING WORKFLOW
# Identify failing tests
npm run test:summary

# Deep dive into specific failure
npm test -- "should validate email format" --verbose

# Run related tests to check side effects
npm test -- Auth --verbose

# 3. CI/CD WORKFLOW  
# Quick feedback for PR
npm run test:changed

# Full validation before merge
npm run test:ci

# Performance check
npm run test:perf
```

#### Custom Test Scripts Setup

Add these to your `package.json` for optimal workflow:

```json
{
  "scripts": {
    "test:summary": "jest --passWithNoTests --reporters=./test-summary-reporter.js",
    "test:quiet": "jest --silent --passWithNoTests",
    "test:changed": "jest --onlyChanged --silent",
    "test:focus": "jest --watch --verbose",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

#### When to Use Each Command

| Situation | Command | Why |
|-----------|---------|-----|
| Daily development check | `npm run test:summary` | Quick overview of project health |
| Debugging specific failure | `npm test -- TestName --verbose` | Detailed error information |
| Working on feature | `npm test -- Feature --watch` | Immediate feedback loop |
| Before committing | `npm run test:changed` | Fast validation of your changes |
| CI/CD pipeline | `npm run test:ci` | Complete validation with coverage |

**Remember**: Verbose output is like a firehose - useful when you need it, overwhelming when you don't!

### Test-Driven Development (TDD) - The Right Way

#### The Sacred TDD Cycle: Red-Green-Refactor
1. **Red**: Write a failing test that describes what you want
2. **Green**: Write the MINIMUM code to make it pass (resist temptation!)
3. **Refactor**: Clean up while keeping tests green

#### TDD Anti-Patterns to Avoid
```typescript
// ❌ ANTI-PATTERN 1: Writing implementation before tests
// This defeats the purpose of TDD
class UserService {
  async createUser(data: UserData) {
    // Complex implementation written first
    // Then tests written to match implementation
    // This is NOT TDD!
  }
}

// ❌ ANTI-PATTERN 2: Cheating to make tests pass
describe('UserService', () => {
  it('should create user', async () => {
    const result = await UserService.createUser(userData);
    expect(result).toBeDefined(); // Useless test!
  });
});

// ✅ CORRECT TDD APPROACH
// 1. Write the test FIRST
describe('UserService', () => {
  it('should create user with encrypted password', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'plaintext123'
    };
    
    const result = await UserService.createUser(userData);
    
    expect(result.user.email).toBe(userData.email);
    expect(result.user.password).not.toBe(userData.password); // Password must be hashed
    expect(result.user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
  });
});

// 2. Write minimal code to pass
class UserService {
  static async createUser(data: UserData) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return {
      user: {
        email: data.email,
        password: hashedPassword
      }
    };
  }
}

// 3. Refactor with confidence
class UserService {
  static async createUser(data: UserData) {
    // Validate input
    const validation = await validateUserData(data);
    if (!validation.valid) {
      throw new ValidationError(validation.errors);
    }
    
    // Hash password with proper salt rounds
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);
    
    // Create user with additional fields
    const user = await UserModel.create({
      ...data,
      password: hashedPassword,
      createdAt: new Date()
    });
    
    return { user };
  }
}
```

### Test Suite Organization

#### 1. Unit Tests
Test individual functions/methods in complete isolation.

```typescript
// packages/api-services/auth-service/__tests__/unit/AuthHelper.test.ts
describe('AuthHelper - Unit Tests', () => {
  describe('generateTokens', () => {
    it('should generate valid JWT tokens', () => {
      const user = { id: '123', email: 'test@example.com' };
      const tokens = AuthHelper.generateTokens(user);
      
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(jwt.verify(tokens.accessToken, JWT_SECRET)).toMatchObject({ id: '123' });
    });
    
    it('should set correct expiration times', () => {
      const user = { id: '123', email: 'test@example.com' };
      const tokens = AuthHelper.generateTokens(user);
      
      const accessDecoded = jwt.decode(tokens.accessToken) as any;
      const refreshDecoded = jwt.decode(tokens.refreshToken) as any;
      
      // Access token expires in 2 hours
      expect(accessDecoded.exp - accessDecoded.iat).toBe(7200);
      // Refresh token expires in 24 hours
      expect(refreshDecoded.exp - refreshDecoded.iat).toBe(86400);
    });
  });
});
```

#### 2. Integration Tests
Test how different parts work together.

```typescript
// packages/api-services/auth-service/__tests__/integration/AuthService.test.ts
describe('AuthService - Integration Tests', () => {
  let dbConnection: MongoMemoryServer;
  
  beforeAll(async () => {
    // Set up in-memory database
    dbConnection = await MongoMemoryServer.create();
    await mongoose.connect(dbConnection.getUri());
  });
  
  afterAll(async () => {
    await mongoose.disconnect();
    await dbConnection.stop();
  });
  
  beforeEach(async () => {
    // Clean database between tests
    await UserModel.deleteMany({});
  });
  
  describe('register', () => {
    it('should create user in database with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        role: 'student'
      };
      
      const result = await AuthService.register(userData);
      
      // Verify user was created in database
      const savedUser = await UserModel.findOne({ email: userData.email });
      expect(savedUser).toBeDefined();
      expect(savedUser!.email).toBe(userData.email);
      
      // Verify password was hashed
      const isValidPassword = await bcrypt.compare(userData.password, savedUser!.password);
      expect(isValidPassword).toBe(true);
    });
    
    it('should prevent duplicate registrations', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        role: 'student'
      };
      
      // First registration should succeed
      await AuthService.register(userData);
      
      // Second registration should fail
      const result = await AuthService.register(userData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });
});
```

#### 3. Functional/E2E Tests
Test complete user workflows from API to database.

```typescript
// packages/api-services/auth-service/__tests__/functional/auth.e2e.test.ts
describe('Authentication API - E2E Tests', () => {
  let app: Application;
  let server: Server;
  
  beforeAll(async () => {
    app = await createApp();
    server = app.listen(0); // Random port
  });
  
  afterAll(async () => {
    await server.close();
  });
  
  describe('POST /api/auth/register', () => {
    it('should complete full registration flow', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        role: 'student',
        profile: {
          firstName: 'John',
          lastName: 'Doe'
        }
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.tokens).toBeDefined();
      
      // Verify we can login with the new account
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);
      
      expect(loginResponse.body.success).toBe(true);
    });
  });
});
```

### Writing Meaningful Tests - Not Useless Ones

#### Understanding WHY You're Testing
```typescript
// ❌ USELESS TEST: Tests implementation details, not behavior
describe('UserService', () => {
  it('should call bcrypt.hash', async () => {
    const bcryptSpy = jest.spyOn(bcrypt, 'hash');
    await UserService.createUser(userData);
    expect(bcryptSpy).toHaveBeenCalled(); // WHO CARES?
  });
});

// ✅ MEANINGFUL TEST: Tests actual business requirement
describe('UserService', () => {
  it('should never store plaintext passwords', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'MySecretPassword123'
    };
    
    const result = await UserService.createUser(userData);
    const savedUser = await UserModel.findById(result.user.id);
    
    // This tests the REQUIREMENT, not the implementation
    expect(savedUser.password).not.toBe(userData.password);
    expect(savedUser.password.length).toBeGreaterThan(50); // Hashed passwords are long
  });
});

// ❌ USELESS TEST: Tests framework functionality
it('should render component', () => {
  const { container } = render(<Button />);
  expect(container).toBeDefined(); // React already guarantees this!
});

// ✅ MEANINGFUL TEST: Tests component behavior
it('should disable submit button when form is invalid', () => {
  render(<LoginForm />);
  const submitButton = screen.getByRole('button', { name: /submit/i });
  
  // Initially disabled with empty form
  expect(submitButton).toBeDisabled();
  
  // Still disabled with only email
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'test@example.com' }
  });
  expect(submitButton).toBeDisabled();
  
  // Enabled when form is complete
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: 'password123' }
  });
  expect(submitButton).toBeEnabled();
});
```

### Test Troubleshooting & Root Cause Analysis

#### When Tests Fail - Find the ROOT CAUSE
```typescript
// Test fails with: "Expected 200 but received 401"

// ❌ WRONG: Blindly changing the test to expect 401
it('should return user profile', async () => {
  const response = await request(app)
    .get('/api/users/profile')
    .expect(401); // Just making the test pass!
});

// ✅ RIGHT: Investigate WHY it's returning 401
it('should return user profile when authenticated', async () => {
  // 1. Understand the requirement: endpoint needs authentication
  // 2. Fix the test to include authentication
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: 'test@example.com', password: 'password123' });
  
  const token = loginResponse.body.data.accessToken;
  
  // 3. Now test with proper authentication
  const response = await request(app)
    .get('/api/users/profile')
    .set('Authorization', `Bearer ${token}`)
    .expect(200); // Now it should work!
  
  expect(response.body.data.email).toBe('test@example.com');
});
```

#### Debugging Failing Tests - Step by Step
```typescript
// When a test fails, follow this process:

// 1. READ THE ERROR MESSAGE CAREFULLY
// Error: Expected value to be 'admin' but received 'student'

// 2. ADD DEBUGGING OUTPUT
it('should assign correct role', async () => {
  const userData = { email: 'admin@example.com', role: 'admin' };
  
  console.log('Input data:', userData); // Debug input
  const result = await UserService.createUser(userData);
  console.log('Result:', result); // Debug output
  
  expect(result.user.role).toBe('admin');
});

// 3. CHECK TEST SETUP
beforeEach(async () => {
  // Is the database clean?
  const existingUsers = await UserModel.find({});
  console.log('Existing users:', existingUsers.length);
  
  // Are mocks set up correctly?
  console.log('Mock config:', mockConfig);
});

// 4. ISOLATE THE PROBLEM
it('should assign role - isolated test', async () => {
  // Test ONLY the role assignment logic
  const user = new UserModel({ email: 'test@example.com', role: 'admin' });
  await user.save();
  
  const saved = await UserModel.findById(user._id);
  expect(saved.role).toBe('admin'); // Does this work?
});

// 5. FIX THE ROOT CAUSE, NOT THE SYMPTOM
// Found: Default role middleware was overriding the input
// Solution: Fix the middleware, not the test!
```

### Testing Commands

#### 🎯 Test Execution Strategy
```bash
# During development - run specific tests
npm test -- AuthService.test.ts --watch

# Before committing - run affected tests  
npm run test:changed

# CI/CD Pipeline - run all tests with coverage
npm run test:ci

# Test organization by type
npm run test:unit         # Fast, isolated tests
npm run test:integration  # Component interaction tests  
npm run test:e2e         # Full workflow tests
```

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
git commit -m "test: add comprehensive auth service tests"
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
- [ ] Tests cover happy path and edge cases
- [ ] Tests are meaningful and test actual requirements
- [ ] No hardcoded secrets or sensitive data
- [ ] Code follows DRY, KISS, and SOLID principles
- [ ] **New dependencies are justified and minimal**
- [ ] **Could vanilla JS/TS be used instead of new libraries?**
- [ ] Comments explain WHY, not WHAT
- [ ] Documentation is updated if needed

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

1. **Follow TDD Religiously**: Red-Green-Refactor is sacred
2. **Write Meaningful Tests**: Test requirements, not implementation
3. **Keep It Simple**: KISS > clever code, minimize dependencies
4. **Don't Repeat Yourself**: Extract common logic
5. **Question Every Dependency**: Can we do this with vanilla JS/TS?
6. **Type Everything**: TypeScript is your friend
7. **Comment the WHY**: Code shows how, comments show why
8. **Handle Errors Gracefully**: Users deserve good error messages
9. **Secure by Default**: Never trust user input
10. **Review Before Merge**: Four eyes are better than two

## 🎯 Quick Reference Commands

```bash
# Development
npm run dev                 # Start all services with health monitoring
npm run dev:frontend        # Frontend only
npm run dev:services        # Backend services only

# Testing (Smart Output Strategy)
npm run test:summary        # Clean overview - lists only failures (RECOMMENDED)
npm run test:quiet          # Minimal output for quick checks
npm run test:changed        # Test only changed files (fast feedback)

# Testing by Type
npm run test:unit           # Fast unit tests
npm run test:integration    # Integration tests
npm run test:e2e           # End-to-end tests

# Detailed Debugging (when you need verbose output)
npm test -- TestName --verbose     # Deep dive into specific failing test
npm test -- AuthService --watch    # Focus on specific area with watch mode

# CI/CD Pipeline
npm run test:ci            # Full suite with coverage (use sparingly)

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
- When in doubt, write a test first.
- If you can't explain it simply, you don't understand it well enough.