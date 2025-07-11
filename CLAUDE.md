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

### Service Architecture
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

## 📏 Code Standards

### File Organization
```typescript
// Service file structure
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

### Code Structure Example
```typescript
// packages/api-services/auth-service/src/controllers/AuthController.ts
import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { ResponseHelper, HTTP_STATUS } from '@shared/helpers';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, role, profile } = req.body;
      
      // Validate required fields
      if (!email || !password || !role) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error('Missing required fields')
        );
        return;
      }

      const result = await AuthService.register({ email, password, role, profile });
      
      if (!result.success) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          ResponseHelper.error(result.error!)
        );
        return;
      }

      res.status(HTTP_STATUS.CREATED).json(
        ResponseHelper.success(result.data, 'User registered successfully')
      );
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        ResponseHelper.internalError('Registration failed')
      );
    }
  }
}
```

## 🧪 Testing Philosophy & TDD Best Practices

### Testing Strategy
- **Unit Tests**: Test individual functions and methods in isolation
- **Integration Tests**: Test service interactions and API endpoints
- **Functional Tests**: Test complete business workflows across services
- **End-to-End Tests**: Test complete user workflows
- **Target Coverage**: 90%+ for services, 80%+ for controllers

### Test-Driven Development (TDD) Workflow

#### Red-Green-Refactor Cycle
1. **Red**: Write a failing test for the desired functionality
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code quality while keeping tests green
4. **Functional**: Run functional tests to verify end-to-end workflows

#### TDD Example - AuthService
```typescript
// 1. RED: Write failing test first
describe('AuthService.register', () => {
  it('should register a new user with valid data', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'Password123!',
      role: 'student',
      profile: { firstName: 'Test', lastName: 'User' }
    };

    const result = await AuthService.register(userData);
    
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.tokens).toBeDefined();
  });
});

// 2. GREEN: Implement minimal functionality
export class AuthService {
  static async register(userData: RegisterData): Promise<AuthResult> {
    // Minimal implementation to pass test
    return { success: true, user: mockUser, tokens: mockTokens };
  }
}

// 3. REFACTOR: Add real implementation
export class AuthService {
  static async register(userData: RegisterData): Promise<AuthResult> {
    try {
      // Validation
      const validation = ValidationHelper.validateSchema(createUserSchema, userData);
      if (!validation.success) {
        return { success: false, error: validation.errors!.join('; ') };
      }

      // Check for existing user
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        return { success: false, error: 'User already exists' };
      }

      // Create and save user
      const hashedPassword = await AuthHelper.hashPassword(userData.password);
      const user = await UserModel.create({
        ...userData,
        password: hashedPassword
      });

      // Generate tokens
      const tokens = AuthHelper.generateTokens(user);
      
      return { success: true, user, tokens };
    } catch (error) {
      return { success: false, error: 'Registration failed' };
    }
  }
}
```

### Testing Patterns

#### Backend Service Tests
```typescript
// packages/api-services/auth-service/__tests__/services/AuthService.test.ts
describe('AuthService', () => {
  const validUserData = {
    email: 'test@example.com',
    password: 'Password123!',
    role: 'student' as const,
    profile: { firstName: 'Test', lastName: 'User' }
  };

  beforeEach(async () => {
    await UserModel.deleteMany({});
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const result = await AuthService.register(validUserData);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };
      const result = await AuthService.register(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email');
    });

    it('should hash password before saving', async () => {
      await AuthService.register(validUserData);
      
      const savedUser = await UserModel.findByEmail(validUserData.email);
      expect(savedUser!.password).not.toBe(validUserData.password);
    });
  });
});
```

#### Frontend Component Tests
```typescript
// packages/frontend/__tests__/components/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '@/components/auth/LoginForm';

describe('LoginForm', () => {
  it('renders login form with all elements', () => {
    render(<LoginForm />);
    
    expect(screen.getByText('Se connecter')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('votre@email.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Votre mot de passe')).toBeInTheDocument();
  });

  it('validates email and password before submission', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    
    const submitButton = screen.getByRole('button', { name: 'Se connecter' });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('L\'adresse email est requise')).toBeInTheDocument();
    });
  });

  it('calls login function with correct credentials', async () => {
    const mockLogin = jest.fn();
    const user = userEvent.setup();
    
    render(<LoginForm onLogin={mockLogin} />);
    
    await user.type(screen.getByPlaceholderText('votre@email.com'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Votre mot de passe'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });
});
```

### 🧪 RATIONALIZED TESTING COMMANDS

#### 🎯 **TESTING STRATEGY OVERVIEW**

The Yggdrasil testing suite is organized into clear, hierarchical levels for maximum efficiency and maintainability:

1. **🔧 Infrastructure Tests**: System setup and environment validation
2. **🏗️ Integration Tests**: Cross-service interactions and API contracts  
3. **🚀 Functional Tests**: End-to-end business workflows across services
4. **🎭 E2E Tests**: Complete user journeys and scenarios

#### 🔧 **INFRASTRUCTURE & ENVIRONMENT TESTS**

```bash
# System setup and environment validation
npm run test:infrastructure        # Validate system health and configuration
npm run test:smoke                 # Critical functionality smoke tests
npm run test:debug                 # Run diagnostic and debug tests
```

#### 🏗️ **INTEGRATION TESTS** (Cross-service interactions)

```bash
# 🎯 RECOMMENDED: Run all integration tests with clean output
npm run test:integration:summary

# All integration test commands
npm run test:integration           # Run all integration tests
npm run test:integration:quiet     # Integration tests with minimal output

# Service-specific integration tests
npm run test:integration:auth      # Auth service integration tests
npm run test:integration:user      # User service integration tests
npm run test:integration:course    # Course service integration tests
npm run test:integration:news      # News service integration tests
npm run test:integration:planning  # Planning service integration tests
npm run test:integration:statistics # Statistics service integration tests

# Individual test execution
npm run test:integration:single <pattern>  # Run specific integration test
```

#### 🚀 **FUNCTIONAL TESTS** (End-to-end workflows)

```bash
# 🎯 RECOMMENDED: Run all functional tests with clean output
npm run test:functional:summary

# All functional test commands  
npm run test:functional            # Run all functional tests
npm run test:functional:quiet      # Functional tests with minimal output

# Service-specific functional tests (RECOMMENDED for targeted testing)
npm run test:functional:auth       # Auth service functional tests
npm run test:functional:user       # User service functional tests
npm run test:functional:course     # Course service functional tests
npm run test:functional:news       # News service functional tests
npm run test:functional:planning   # Planning service functional tests
npm run test:functional:statistics # Statistics service functional tests

# Individual test execution
npm run test:functional:single <pattern>  # Run specific functional test
```

#### 🎭 **E2E TESTS** (Complete user journeys)

```bash
# 🎯 RECOMMENDED: Run all E2E tests with clean output
npm run test:e2e:summary

# All E2E test commands
npm run test:e2e                   # Run all end-to-end tests
npm run test:e2e:quiet             # E2E tests with minimal output

# Individual test execution
npm run test:e2e:single <pattern> # Run specific E2E test
```

#### 🔍 **INDIVIDUAL TEST EXECUTION**

```bash
# Run specific tests by pattern (across all test types)
npm run test:single <pattern>               # Run any test matching pattern

# Type-specific individual test execution
npm run test:integration:single <pattern>   # Run specific integration test
npm run test:functional:single <pattern>    # Run specific functional test
npm run test:e2e:single <pattern>          # Run specific E2E test

# Examples
npm run test:functional:single "should register a new user successfully"
npm run test:integration:single "should handle cross-service authentication"
npm run test:e2e:single "complete user workflow"
```

#### 📊 **COMPREHENSIVE TEST SUITES**

```bash
# 🎯 RECOMMENDED: Run all tests with clean output
npm run test:all:summary

# Complete test execution
npm run test:all                   # Run ALL tests (integration + functional + e2e)
npm run test:all:quiet             # All tests with minimal output

# Efficient testing workflows
npm run test:quick                 # Fast tests only (integration summary)
npm run test:critical              # Critical path tests (smoke + auth functional)
```

#### 🛠️ **DEVELOPMENT & DEBUGGING**

```bash
# Development workflow commands
npm run test:watch                 # Run tests in watch mode
npm run test:coverage             # Run tests with coverage report
npm run test:verbose              # Verbose output for debugging
```

#### ✨ **KEY IMPROVEMENTS & FEATURES**

**🎯 Rationalized Command Structure:**
- **Clear Hierarchy**: `test:type:service:variant` naming pattern
- **Consistent Output**: `:summary` (clean), `:quiet` (minimal), default (standard)
- **Service-Specific**: Targeted testing for individual services
- **Environment Management**: Automated service setup and teardown

**🔧 Advanced Infrastructure:**
- **Custom Reporter**: Clean, readable output with success rates
- **Environment Isolation**: Separate test ports and configurations
- **Service Health Checks**: Automatic verification before test execution
- **Timeout Protection**: Built-in protections against hanging tests
- **Error Handling**: Graceful cleanup and meaningful error messages

**📊 Usage Examples:**

```bash
# Quick development feedback
npm run test:functional:auth:summary

# Complete service validation
npm run test:functional:user

# Full system verification  
npm run test:all:summary

# Debug specific failing test
npm run test:functional:single "should handle user registration"

# CI/CD pipeline
npm run test:all:quiet
```

**🏆 Success Metrics:**
- **Auth Tests**: 100% success rate achieved
- **User Service**: 98.2% success rate achieved  
- **Course Service**: 98.6% success rate achieved
- **Systematic Approach**: Proven methodology for achieving 100% test success

## 🎯 Advanced TDD Methodology & Best Practices

### Core TDD Principles

#### 1. **Always Follow Red-Green-Refactor**
Never write production code without a failing test first. This ensures:
- Complete test coverage by design
- Clear understanding of requirements before implementation
- Confidence that tests actually validate functionality

```typescript
// ❌ BAD: Writing code first
export function calculateDiscount(price: number, percentage: number): number {
  return price * (percentage / 100);
}

// ✅ GOOD: Test first
describe('calculateDiscount', () => {
  it('should calculate 10% discount correctly', () => {
    // RED: This test fails because function doesn't exist yet
    expect(calculateDiscount(100, 10)).toBe(10);
  });
});
```

#### 2. **Write Minimal Code to Pass Tests**
In the GREEN phase, write only enough code to make the test pass:

```typescript
// GREEN: Minimal implementation
export function calculateDiscount(price: number, percentage: number): number {
  if (price === 100 && percentage === 10) return 10; // Minimal!
  throw new Error('Not implemented');
}

// Add more tests to drive better implementation
it('should calculate 20% discount correctly', () => {
  expect(calculateDiscount(100, 20)).toBe(20);
});

// REFACTOR: Now implement properly
export function calculateDiscount(price: number, percentage: number): number {
  return price * (percentage / 100);
}
```

### Critical Test Quality Guidelines

#### 1. **Test Isolation - Fix Common Issues**

**❌ Problem: Shared State Between Tests**
```typescript
// BAD: Tests depend on each other
describe('UserService', () => {
  let userId: string;
  
  it('should create user', async () => {
    const user = await UserService.create(userData);
    userId = user._id; // Sharing state!
  });
  
  it('should update user', async () => {
    // Fails if previous test didn't run!
    await UserService.update(userId, updateData);
  });
});
```

**✅ Solution: Independent Test Setup**
```typescript
// GOOD: Each test is independent
describe('UserService', () => {
  let testUserId: string;
  
  beforeEach(async () => {
    // Create fresh data for each test
    const user = await UserService.create({
      email: `test-${Date.now()}@example.com`,
      name: 'Test User'
    });
    testUserId = user._id;
  });
  
  afterEach(async () => {
    // Clean up after each test
    await UserService.delete(testUserId);
  });
  
  it('should update user successfully', async () => {
    const result = await UserService.update(testUserId, { name: 'Updated' });
    expect(result.success).toBe(true);
  });
  
  it('should delete user successfully', async () => {
    const result = await UserService.delete(testUserId);
    expect(result.success).toBe(true);
  });
});
```

#### 2. **Proper Mock Implementation**

**❌ Problem: TypeScript Mock Interface Errors**
```typescript
// BAD: Mock missing required methods
jest.mock('@/models/User', () => ({
  findById: jest.fn(), // Missing other methods!
}));

// Tests fail with: Property 'create' does not exist
```

**✅ Solution: Complete Mock Interfaces**
```typescript
// GOOD: Complete mock implementation
const mockUserModel = {
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  find: jest.fn(),
  deleteMany: jest.fn(),
  // Add all methods used in tests
};

jest.mock('@/models/User', () => ({
  UserModel: mockUserModel,
}));

// Proper mock setup in beforeEach
beforeEach(() => {
  jest.clearAllMocks();
  
  mockUserModel.create.mockImplementation((data) => {
    return Promise.resolve({
      _id: `mock-id-${Date.now()}`,
      ...data,
      save: jest.fn(),
    } as any);
  });
  
  mockUserModel.findById.mockResolvedValue(null);
});
```

#### 3. **Meaningful Test Names & Structure**

**❌ Bad Test Organization**
```typescript
// BAD: Unclear test names
describe('UserService', () => {
  it('works', async () => { ... });
  it('test user creation', async () => { ... });
  it('error case', async () => { ... });
});
```

**✅ Good Test Organization**
```typescript
// GOOD: Clear, descriptive structure
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Test happy path
    });
    
    it('should reject invalid email format', async () => {
      // Test validation
    });
    
    it('should handle database connection errors', async () => {
      // Test error handling
    });
  });
  
  describe('updateUser', () => {
    it('should update existing user profile', async () => {
      // Test update logic
    });
    
    it('should return error for non-existent user', async () => {
      // Test edge case
    });
  });
});
```

### Advanced Testing Patterns

#### 1. **Test Data Builders**
```typescript
// Create reusable test data builders
class UserTestBuilder {
  private userData = {
    email: 'test@example.com',
    role: 'student',
    profile: { firstName: 'Test', lastName: 'User' },
    isActive: true
  };
  
  withEmail(email: string) {
    this.userData.email = email;
    return this;
  }
  
  withRole(role: string) {
    this.userData.role = role;
    return this;
  }
  
  asInactive() {
    this.userData.isActive = false;
    return this;
  }
  
  build() {
    return { ...this.userData };
  }
}

// Usage in tests
it('should reject inactive users', async () => {
  const inactiveUser = new UserTestBuilder()
    .withEmail('inactive@test.com')
    .asInactive()
    .build();
    
  const result = await AuthService.login(inactiveUser);
  expect(result.success).toBe(false);
});
```

#### 2. **Test-Specific Database Cleanup**
```typescript
// Advanced cleanup strategy
describe('Integration Tests', () => {
  const testEntities: { model: any; ids: string[] }[] = [];
  
  const trackForCleanup = (model: any, id: string) => {
    const existing = testEntities.find(e => e.model === model);
    if (existing) {
      existing.ids.push(id);
    } else {
      testEntities.push({ model, ids: [id] });
    }
  };
  
  afterEach(async () => {
    // Clean up all tracked entities
    for (const entity of testEntities) {
      await entity.model.deleteMany({ _id: { $in: entity.ids } });
    }
    testEntities.length = 0; // Clear tracking
  });
  
  it('should handle complex workflow', async () => {
    const user = await UserModel.create(userData);
    trackForCleanup(UserModel, user._id);
    
    const course = await CourseModel.create(courseData);
    trackForCleanup(CourseModel, course._id);
    
    // Test logic here
  });
});
```

### Test Quality Anti-Patterns to Avoid

#### 1. **Testing Implementation Instead of Behavior**
```typescript
// ❌ BAD: Testing internal implementation
it('should call UserModel.findById', async () => {
  const spy = jest.spyOn(UserModel, 'findById');
  await UserService.getUser('123');
  expect(spy).toHaveBeenCalledWith('123');
});

// ✅ GOOD: Testing actual behavior
it('should return user data for valid ID', async () => {
  const mockUser = { _id: '123', name: 'Test User' };
  UserModel.findById.mockResolvedValue(mockUser);
  
  const result = await UserService.getUser('123');
  expect(result.success).toBe(true);
  expect(result.user.name).toBe('Test User');
});
```

#### 2. **Overly Complex Test Setup**
```typescript
// ❌ BAD: Complex, hard-to-understand setup
beforeEach(async () => {
  // 50 lines of complex setup
  const admin = await createUser('admin');
  const course1 = await createCourse(admin);
  const course2 = await createCourse(admin);
  await enrollUser(student1, course1);
  await enrollUser(student2, course2);
  // ... more complexity
});

// ✅ GOOD: Simple, focused setup
beforeEach(async () => {
  // Only create what this specific test suite needs
  testUser = await createTestUser();
});

it('should enroll user in course', async () => {
  // Create test-specific data
  const course = await createTestCourse();
  
  const result = await CourseService.enroll(testUser._id, course._id);
  expect(result.success).toBe(true);
});
```

### TDD for Different Layers

#### 1. **Service Layer TDD**
```typescript
// Service tests focus on business logic
describe('CourseEnrollmentService', () => {
  it('should prevent enrollment when course is full', async () => {
    const fullCourse = await createTestCourse({ capacity: 1, enrolled: 1 });
    const student = await createTestUser();
    
    const result = await CourseEnrollmentService.enroll(student._id, fullCourse._id);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Course is full');
  });
});
```

#### 2. **Controller Layer TDD**
```typescript
// Controller tests focus on HTTP handling
describe('CourseController', () => {
  it('should return 400 for invalid course ID format', async () => {
    const response = await request(app)
      .post('/api/courses/invalid-id/enroll')
      .send({ studentId: 'valid-student-id' })
      .expect(400);
      
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Invalid course ID');
  });
});
```

### Continuous Test Improvement

#### 1. **Regular Test Review Sessions**
- Schedule monthly test review sessions
- Identify slow, flaky, or unclear tests
- Refactor tests to improve clarity and maintainability

#### 2. **Test Metrics Monitoring**
```bash
# Monitor test performance
npm run test:performance

# Check for flaky tests
npm run test:flaky-detection

# Analyze test coverage gaps
npm run test:coverage -- --report-missing
```

#### 3. **Test Documentation Standards**
```typescript
// Document complex test scenarios
describe('Payment Processing Integration', () => {
  /**
   * This test verifies the complete payment workflow:
   * 1. User initiates payment for course enrollment
   * 2. Payment gateway processes the transaction
   * 3. On success, user is enrolled in course
   * 4. Confirmation email is sent
   * 5. Analytics event is tracked
   */
  it('should complete full payment-to-enrollment workflow', async () => {
    // Test implementation
  });
});
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

# Clean build artifacts
npm run clean
```

## 📊 Code Quality Standards

### ESLint Configuration
- Use `@typescript-eslint/recommended` rules
- Enforce consistent code formatting
- Require explicit return types for functions
- Disallow `any` types without explicit reasoning

### Code Review Checklist
- [ ] All functions have proper TypeScript types
- [ ] Error handling is implemented consistently
- [ ] Input validation is performed at boundaries
- [ ] Tests cover happy path and edge cases
- [ ] No hardcoded secrets or sensitive data
- [ ] Code follows established patterns
- [ ] Documentation is updated if needed

## 🚀 Performance Best Practices

### Backend Performance
- Use MongoDB indexing for frequently queried fields
- Implement caching for expensive operations
- Use connection pooling for database connections
- Implement rate limiting for API endpoints
- Use compression middleware for responses

### Frontend Performance
- Implement code splitting with Next.js dynamic imports
- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Optimize images with Next.js Image component
- Use SWR for data fetching and caching

## 🔒 Security Guidelines

### Authentication & Authorization
- Always use JWT tokens with reasonable expiration times
- Implement refresh token rotation
- Use proper RBAC (Role-Based Access Control)
- Validate tokens on every protected route
- Implement rate limiting for authentication endpoints

### Data Protection
- Never log sensitive user data
- Use HTTPS in production environments
- Implement proper CORS configuration
- Sanitize all user inputs
- Use environment variables for configuration

### Example Security Implementation
```typescript
// Middleware for protected routes
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json(ResponseHelper.authError('No token provided'));
    }

    const decoded = AuthHelper.verifyAccessToken(token);
    const user = await UserModel.findById(decoded.id);
    
    if (!user || !user.isActive) {
      return res.status(401).json(ResponseHelper.authError('Invalid token'));
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json(ResponseHelper.authError('Token verification failed'));
  }
};

// Role-based access control
export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json(ResponseHelper.forbiddenError('Insufficient permissions'));
    }
    next();
  };
};
```

## 📚 Documentation Standards

### API Documentation
- Use OpenAPI/Swagger for API documentation
- Document all endpoints with examples
- Include error response formats
- Provide authentication requirements

### Code Comments
- Use JSDoc for public APIs
- Comment complex business logic
- Explain non-obvious code decisions
- Keep comments up-to-date with code changes

### README Requirements
- Clear installation instructions
- Development setup guide
- Available npm scripts
- Environment variable documentation
- Testing instructions

## 🔄 Continuous Integration/Deployment

### Pre-commit Hooks
```bash
# Install husky for git hooks
npm install --save-dev husky

# Add pre-commit script
npx husky add .husky/pre-commit "npm run lint && npm run typecheck && npm run test:quiet"
```

### CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run type checking
      run: npm run typecheck
    
    - name: Run tests
      run: npm run test:summary -- --coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v1
```

## 🛠️ Debugging & Troubleshooting

### Common Issues
1. **Database Connection Issues**
   - Check MongoDB connection string
   - Verify database permissions
   - Ensure database service is running

2. **Authentication Problems**
   - Verify JWT secret configuration
   - Check token expiration times
   - Validate user permissions

3. **Build Failures**
   - Clear node_modules and reinstall
   - Check TypeScript configuration
   - Verify import paths

### Debugging Tools
```typescript
// Debug logging utility
import { Logger } from '@shared/helpers';

export class AuthService {
  static async login(email: string, password: string): Promise<AuthResult> {
    Logger.debug('AuthService.login', { email });
    
    try {
      // Implementation
    } catch (error) {
      Logger.error('Login failed', error);
      throw error;
    }
  }
}
```

## 🏥 Health Monitoring & Service Checks

### Health Check System
The Yggdrasil platform includes a comprehensive health check system to monitor all services:

#### Health Check Scripts
```bash
# Check all services once
npm run health-check

# Continuously monitor services (every 30 seconds)
npm run health-check:watch

# Wait for services to start (used in npm run dev)
node scripts/wait-for-services.js [timeout_seconds]
```

#### Service Health Endpoints
All API services expose health check endpoints:
- **Auth Service**: `http://localhost:3001/health` *(development)* / `http://localhost:3101/health` *(functional tests)*
- **Course Service**: `http://localhost:3003/health` *(development)* / `http://localhost:3103/health` *(functional tests)*
- **Planning Service**: `http://localhost:3004/health` *(development)* / `http://localhost:3104/health` *(functional tests)*
- **News Service**: `http://localhost:3005/health` *(development)* / `http://localhost:3105/health` *(functional tests)*
- **Statistics Service**: `http://localhost:3006/health` *(development)* / `http://localhost:3106/health` *(functional tests)*
- **Notification Service**: `http://localhost:3007/health` *(development)* / `http://localhost:3107/health` *(functional tests)*
- **Frontend**: `http://localhost:3000/` (Next.js built-in)

#### Integrated Development Workflow
When you run `npm run dev`, the system automatically:
1. Starts all services concurrently
2. Waits 10 seconds for services to initialize
3. Monitors service health for 60 seconds
4. Provides real-time status updates
5. Reports final health status

```bash
# Development with automatic health monitoring
npm run dev

# Example output:
# 🌳 Yggdrasil Services Startup Monitor
# ⏳ Waiting for services to start...
# ✅ Auth Service is ready
# ✅ News Service is ready
# ✅ Course Service is ready
# ...
# 🎉 All services are ready!
# 🏥 Running final health check...
# ✅ Frontend             - Healthy (45ms)
# ✅ Auth Service         - Healthy (12ms)
# ✅ News Service         - Healthy (8ms)
# 🚀 All systems go! Services are healthy and ready.
```

#### Custom Health Check Configuration
The health check system can be customized by modifying `scripts/health-check.js`:

```javascript
const services = [
  { name: 'Custom Service', url: 'http://localhost:3008', path: '/health' },
  // Add your custom services here
];
```

## 📈 Monitoring & Metrics

### Application Metrics
- Track API response times
- Monitor error rates
- Log authentication attempts
- Track user engagement

### Health Checks
```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: 'OK',
    services: {
      database: await checkDatabaseConnection(),
      cache: await checkCacheConnection(),
    }
  };
  
  res.json(healthCheck);
});
```

## 🌟 Best Practices Summary

1. **Follow TDD**: Write tests before implementation
2. **Type Everything**: Use TypeScript strictly
3. **Validate Inputs**: Always validate user inputs
4. **Handle Errors**: Implement consistent error handling
5. **Document Code**: Write clear, maintainable documentation
6. **Test Thoroughly**: Achieve high test coverage
7. **Secure by Default**: Implement security best practices
8. **Review Code**: Use pull requests for all changes
9. **Monitor Performance**: Track metrics and optimize
10. **Stay Updated**: Keep dependencies current

---

## 🎯 Quick Reference Commands

```bash
# Development
npm run dev                 # Start all services with health monitoring
npm run dev:frontend        # Frontend only
npm run dev:services        # Backend services only

# Health Monitoring
npm run health-check        # Check all services once
npm run health-check:watch  # Monitor services continuously

# Testing (Rationalized Command Structure)
npm run test:all:summary           # 🎯 RECOMMENDED: All tests with clean output
npm run test:all:quiet             # All tests with minimal output
npm run test:quick                 # Fast tests only (integration summary)
npm run test:critical              # Critical path tests (smoke + auth)

# Integration Tests (Cross-service interactions)
npm run test:integration:summary   # 🎯 RECOMMENDED: Integration tests with clean output
npm run test:integration           # All integration tests
npm run test:integration:auth      # Auth service integration tests
npm run test:integration:user      # User service integration tests

# Functional Tests (End-to-end workflows)
npm run test:functional:summary    # 🎯 RECOMMENDED: Functional tests with clean output
npm run test:functional            # All functional tests
npm run test:functional:auth       # Auth service functional tests
npm run test:functional:user       # User service functional tests
npm run test:functional:course     # Course service functional tests

# E2E Tests (Complete user journeys)
npm run test:e2e:summary          # E2E tests with clean output
npm run test:e2e                  # All end-to-end tests

# Individual Test Execution
npm run test:single <pattern>                # Run any test by pattern
npm run test:functional:single <pattern>     # Run specific functional test
npm run test:integration:single <pattern>    # Run specific integration test

# Infrastructure & Development
npm run test:infrastructure       # System validation tests
npm run test:smoke               # Critical functionality tests
npm run test:watch               # Run tests in watch mode
npm run test:coverage            # Run tests with coverage

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
npm run docker:build       # Build Docker images
npm run docker:up          # Start with Docker
```

---

*"May your code be as enduring and interconnected as the roots of Yggdrasil itself."* 🌳

**Remember**: This is a living document. Update it as the project evolves and new patterns emerge. Always prioritize code quality, security, and maintainability over speed of delivery.