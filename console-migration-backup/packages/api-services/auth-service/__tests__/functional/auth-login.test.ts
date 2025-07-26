// packages/api-services/auth-service/__tests__/functional/auth-login.test.ts
// Functional tests for login and authentication workflows

import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, UserModel } from '@yggdrasil/database-schemas';
import { Application } from 'express';

describe('Auth Login Functional Tests', () => {
  let app: Application;
  
  // Test users to be created before tests
  const testUsers = {
    activeStudent: {
      email: 'active.student@yggdrasil.edu',
      password: 'StudentPass123!',
      role: 'student',
      profile: {
        firstName: 'Active',
        lastName: 'Student',
        studentId: 'STU111111'
      },
      isActive: true
    },
    activeTeacher: {
      email: 'active.teacher@yggdrasil.edu',
      password: 'TeacherPass123!',
      role: 'teacher',
      profile: {
        firstName: 'Active',
        lastName: 'Teacher',
        department: 'Mathematics'
      },
      isActive: true
    },
    inactiveUser: {
      email: 'inactive.user@yggdrasil.edu',
      password: 'InactivePass123!',
      role: 'student',
      profile: {
        firstName: 'Inactive',
        lastName: 'User',
        studentId: 'STU222222'
      },
      isActive: false
    },
    adminUser: {
      email: 'admin@yggdrasil.edu',
      password: 'AdminPass123!',
      role: 'admin',
      profile: {
        firstName: 'Admin',
        lastName: 'User'
      },
      isActive: true
    }
  };

  beforeAll(async () => {
    app = createApp();
    await connectDatabase(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27018/yggdrasil-test');
    
    // Create test users (let Mongoose handle password hashing)
    for (const [key, user] of Object.entries(testUsers)) {
      await UserModel.create({
        email: user.email,
        password: user.password, // Raw password - Mongoose will hash it
        role: user.role,
        profile: user.profile,
        isActive: user.isActive
      });
    }
  });

  afterAll(async () => {
    // Clean up test users
    await UserModel.deleteMany({ 
      email: { $in: Object.values(testUsers).map(u => u.email) } 
    });
    await disconnectDatabase();
  });

  describe('POST /api/auth/login - Success Scenarios', () => {
    it('should successfully login with valid student credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.activeStudent.email,
          password: testUsers.activeStudent.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Login successful');
      expect(response.body.data.user.email).toBe(testUsers.activeStudent.email);
      expect(response.body.data.user.role).toBe('student');
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
      
      // Should not expose sensitive data
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.user.tokenVersion).toBeUndefined();
    });

    it('should successfully login with valid teacher credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.activeTeacher.email,
          password: testUsers.activeTeacher.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('teacher');
      expect(response.body.data.tokens).toBeDefined();
    });

    it('should successfully login with valid admin credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.adminUser.email,
          password: testUsers.adminUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('admin');
      expect(response.body.data.tokens).toBeDefined();
    });

    it('should update lastLogin timestamp on successful login', async () => {
      const beforeLogin = new Date();
      
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.activeStudent.email,
          password: testUsers.activeStudent.password
        })
        .expect(200);

      const user = await UserModel.findByEmail(testUsers.activeStudent.email);
      expect(user?.lastLogin).toBeDefined();
      expect(user?.lastLogin?.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });

    it('should handle case-insensitive email login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.activeStudent.email.toUpperCase(),
          password: testUsers.activeStudent.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUsers.activeStudent.email);
    });
  });

  describe('POST /api/auth/login - Failure Scenarios', () => {
    it('should fail login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.activeStudent.email,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid email or password');
      expect(response.body.data).toBeUndefined();
    });

    it('should fail login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@yggdrasil.edu',
          password: 'AnyPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should fail login with inactive account', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.inactiveUser.email,
          password: testUsers.inactiveUser.password
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('locked');
    });

    it('should fail login with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Password123!'
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Email and password are required');
    });

    it('should fail login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.activeStudent.email
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Email and password are required');
    });

    it('should fail login with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email-format',
          password: 'Password123!'
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid email format');
    });

    it('should fail login with empty credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: '',
          password: ''
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Email and password are required');
    });

    it('should not reveal whether email exists in system', async () => {
      const wrongPasswordResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.activeStudent.email,
          password: 'WrongPassword123!'
        });

      const nonExistentEmailResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@yggdrasil.edu',
          password: 'WrongPassword123!'
        });

      // Both should return the same error message to prevent user enumeration
      expect(wrongPasswordResponse.body.error).toBe('Invalid email or password');
      expect(nonExistentEmailResponse.body.error).toBe('Invalid email or password');
      expect(wrongPasswordResponse.status).toBe(nonExistentEmailResponse.status);
    });
  });

  describe('Login Security Features', () => {
    it('should be protected against SQL injection attempts', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin@yggdrasil.edu' OR '1'='1",
          password: "' OR '1'='1"
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid email format');
    });

    it('should handle very long input gracefully', async () => {
      const veryLongEmail = 'a'.repeat(1000) + '@yggdrasil.edu';
      const veryLongPassword = 'p'.repeat(1000);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: veryLongEmail,
          password: veryLongPassword
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    // Note: Rate limiting is not implemented yet in the current system
    // This test would be added when rate limiting middleware is implemented
  });

  describe('JWT Token Validation', () => {
    it('should return valid JWT tokens with correct structure', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.activeStudent.email,
          password: testUsers.activeStudent.password
        })
        .expect(200);

      const { accessToken, refreshToken } = response.body.data.tokens;

      // Decode tokens without verification to check structure
      const accessTokenParts = accessToken.split('.');
      const refreshTokenParts = refreshToken.split('.');

      expect(accessTokenParts).toHaveLength(3); // header.payload.signature
      expect(refreshTokenParts).toHaveLength(3);

      // Decode payload
      const accessPayload = JSON.parse(Buffer.from(accessTokenParts[1], 'base64').toString());
      expect(accessPayload.id).toBeDefined();
      expect(accessPayload.email).toBe(testUsers.activeStudent.email);
      expect(accessPayload.role).toBe('student');
      expect(accessPayload.type).toBe('access');
      expect(accessPayload.exp).toBeDefined();
      expect(accessPayload.iat).toBeDefined();
    });

    it('should return different tokens for each login', async () => {
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.activeStudent.email,
          password: testUsers.activeStudent.password
        });

      // Add delay to ensure different iat timestamp
      await new Promise(resolve => setTimeout(resolve, 1100));

      const response2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.activeStudent.email,
          password: testUsers.activeStudent.password
        });

      expect(response1.body.data.tokens.accessToken).not.toBe(response2.body.data.tokens.accessToken);
      expect(response1.body.data.tokens.refreshToken).not.toBe(response2.body.data.tokens.refreshToken);
    });
  });
});