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
- **End-to-End Tests**: Test complete user workflows
- **Target Coverage**: 90%+ for services, 80%+ for controllers

### Test-Driven Development (TDD) Workflow

#### Red-Green-Refactor Cycle
1. **Red**: Write a failing test for the desired functionality
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code quality while keeping tests green

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

### Testing Commands

#### 🎯 Recommended Test Commands
For large codebases with many tests, use these optimized commands that provide clean, readable summaries:

```bash
# Run all tests with clean summary (RECOMMENDED)
npm run test:summary

# Run tests with minimal output (for quick checks)
npm run test:quiet

# Full verbose output (use sparingly - generates wall of text)
npm test
```

**Output Example:**
```
================================================================================
🌳 YGGDRASIL TEST SUMMARY
================================================================================
📊 Total Tests: 150
✅ Passed: 148
❌ Failed: 2
⏳ Pending: 0
📈 Success Rate: 98.7%

📦 PACKAGE BREAKDOWN:
  ✅ api-gateway: 4 test files
  ❌ auth-service: 8 test files
  ✅ frontend: 12 test files

🔥 FAILED TESTS:
  📁 auth-service:
    ❌ AuthService should validate email format
    ❌ AuthMiddleware should handle expired tokens

================================================================================
🎯 Overall Result: ❌ 2 TESTS FAILED
================================================================================
```

#### 🔧 Other Test Commands
```bash
# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- AuthService.test.ts

# Run tests for specific service
cd packages/api-services/auth-service && npm test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
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
npm run dev                 # Start all services
npm run dev:frontend        # Frontend only
npm run dev:services        # Backend services only

# Testing
npm run test:summary        # Run all tests with clean summary (RECOMMENDED)
npm run test:quiet          # Run tests with minimal output
npm test                    # Run all tests (verbose - use sparingly)
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests
npm run test:e2e           # End-to-end tests

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