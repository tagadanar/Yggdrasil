// packages/api-services/auth-service/__tests__/functional/auth-registration.test.ts
// Functional tests for disabled public registration

import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, UserModel } from '@yggdrasil/database-schemas';
import { Application } from 'express';

describe('Auth Registration Functional Tests - Public Registration Disabled', () => {
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

  describe('POST /api/auth/register - Registration Disabled', () => {
    it('should reject any public registration attempt', async () => {
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
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Public registration is disabled');

      // Verify user was NOT created in database
      const createdUser = await UserModel.findByEmail(studentData.email);
      expect(createdUser).toBeNull();
    });

    it('should reject teacher registration attempts', async () => {
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
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Public registration is disabled');
    });

    it('should reject admin registration attempts', async () => {
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
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Public registration is disabled');
    });

    it('should reject staff registration attempts', async () => {
      const staffData = {
        email: 'test.staff@yggdrasil.edu',
        password: 'SecurePass123!',
        role: 'staff',
        profile: {
          firstName: 'Test',
          lastName: 'Staff',
          department: 'Administration'
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(staffData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Public registration is disabled');
    });

    it('should reject registration even with valid data', async () => {
      const validData = {
        email: 'test.valid@yggdrasil.edu',
        password: 'VerySecurePass123!@#',
        role: 'student',
        profile: {
          firstName: 'Valid',
          lastName: 'User',
          studentId: 'STU999999',
          department: 'Engineering'
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(validData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Public registration is disabled');
    });

    it('should not expose validation errors for registration attempts', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123', // Weak password
        role: 'invalid-role',
        profile: {
          firstName: 'Test'
          // Missing required fields
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(403);

      // Should not expose validation details, just generic error
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Public registration is disabled');
      expect(response.body.error).not.toContain('Invalid email');
      expect(response.body.error).not.toContain('Password must');
    });
  });

  describe('Registration Status Endpoint', () => {
    it('should indicate registration is disabled', async () => {
      const response = await request(app)
        .get('/api/auth/registration-status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.registrationEnabled).toBe(false);
      expect(response.body.data.message).toContain('User creation is restricted to administrators');
    });
  });

  // Note: Admin-based user creation tests would be in the user-service tests
  // This file only tests that public registration is properly disabled
});