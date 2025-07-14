// packages/api-services/auth-service/__tests__/functional/auth-registration.test.ts
// Functional tests for user registration workflow

import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, UserModel } from '@yggdrasil/database-schemas';
import { Application } from 'express';

describe('Auth Registration Functional Tests', () => {
  let app: Application;

  beforeAll(async () => {
    app = createApp();
    await connectDatabase(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27018/yggdrasil-test');
  });

  afterAll(async () => {
    await UserModel.deleteMany({ email: { $regex: /test.*@yggdrasil\.edu/ } });
    await disconnectDatabase();
  });

  afterEach(async () => {
    // Clean up test users after each test
    await UserModel.deleteMany({ email: { $regex: /test.*@yggdrasil\.edu/ } });
  });

  describe('POST /api/auth/register - Student Registration', () => {
    it('should successfully register a new student', async () => {
      const studentData = {
        email: 'test.student@yggdrasil.edu',
        password: 'SecurePass123!',
        role: 'student',
        profile: {
          firstName: 'Test',
          lastName: 'Student',
          studentId: 'STU123456',
          department: 'Computer Science'
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(studentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('registered successfully');
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(studentData.email);
      expect(response.body.data.user.role).toBe('student');
      expect(response.body.data.user.profile.firstName).toBe('Test');
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();

      // Verify user was created in database
      const createdUser = await UserModel.findByEmail(studentData.email);
      expect(createdUser).toBeDefined();
      expect(createdUser?.isActive).toBe(true);
    });

    it('should successfully register a new teacher', async () => {
      const teacherData = {
        email: 'test.teacher@yggdrasil.edu',
        password: 'SecurePass123!',
        role: 'teacher',
        profile: {
          firstName: 'Test',
          lastName: 'Teacher',
          department: 'Mathematics',
          specialties: ['Calculus', 'Linear Algebra'],
          officeHours: 'Mon/Wed 2-4pm'
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(teacherData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('teacher');
      expect(response.body.data.user.profile.specialties).toEqual(['Calculus', 'Linear Algebra']);
    });

    it('should fail registration with duplicate email', async () => {
      const userData = {
        email: 'test.duplicate@yggdrasil.edu',
        password: 'SecurePass123!',
        role: 'student',
        profile: {
          firstName: 'Test',
          lastName: 'Duplicate',
          studentId: 'STU999999'
        }
      };

      // First registration should succeed
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email should fail
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should fail registration with invalid email format', async () => {
      const invalidEmailData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        role: 'student',
        profile: {
          firstName: 'Test',
          lastName: 'Invalid'
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidEmailData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid email');
    });

    it('should fail registration with weak password', async () => {
      const weakPasswordData = {
        email: 'test.weak@yggdrasil.edu',
        password: '123456', // Too weak
        role: 'student',
        profile: {
          firstName: 'Test',
          lastName: 'Weak'
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Password must');
    });

    it('should fail registration with missing required profile fields', async () => {
      const incompleteData = {
        email: 'test.incomplete@yggdrasil.edu',
        password: 'SecurePass123!',
        role: 'student',
        profile: {
          firstName: 'Test'
          // Missing lastName
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Required');
    });

    it('should fail registration with invalid role', async () => {
      const invalidRoleData = {
        email: 'test.invalid@yggdrasil.edu',
        password: 'SecurePass123!',
        role: 'superuser', // Invalid role
        profile: {
          firstName: 'Test',
          lastName: 'Invalid'
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidRoleData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid enum value');
    });

    it('should successfully register admin (no restriction currently implemented)', async () => {
      const adminData = {
        email: 'test.admin@yggdrasil.edu',
        password: 'SecurePass123!',
        role: 'admin',
        profile: {
          firstName: 'Test',
          lastName: 'Admin'
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(adminData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('admin');
    });

    it('should prevent duplicate studentId (database constraint)', async () => {
      const studentId = 'STU777777';
      
      const student1 = {
        email: 'test.student1@yggdrasil.edu',
        password: 'SecurePass123!',
        role: 'student',
        profile: {
          firstName: 'Student',
          lastName: 'One',
          studentId: studentId
        }
      };

      // First student registration should succeed
      await request(app)
        .post('/api/auth/register')
        .send(student1)
        .expect(201);

      // Second student with same studentId should fail
      const student2 = {
        email: 'test.student2@yggdrasil.edu',
        password: 'SecurePass123!',
        role: 'student',
        profile: {
          firstName: 'Student',
          lastName: 'Two',
          studentId: studentId
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(student2)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Internal server error');
    });

    it('should set default preferences for new users', async () => {
      const userData = {
        email: 'test.defaults@yggdrasil.edu',
        password: 'SecurePass123!',
        role: 'student',
        profile: {
          firstName: 'Test',
          lastName: 'Defaults',
          studentId: 'STU888888'
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Verify default preferences were set
      const user = await UserModel.findByEmail(userData.email);
      expect(user?.preferences).toBeDefined();
      expect(user?.preferences.language).toBe('fr'); // Default language
      expect(user?.preferences.notifications.scheduleChanges).toBe(true);
      expect(user?.preferences.accessibility.fontSize).toBe('medium');
    });
  });

  // Note: Rate limiting is not currently implemented
  // This test would be added when rate limiting middleware is implemented
  // describe('Registration Rate Limiting', () => {
  //   it('should rate limit registration attempts from same IP', async () => {
  //     // Test implementation would go here
  //   });
  // });
});