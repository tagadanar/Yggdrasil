// packages/api-services/user-service/__tests__/functional/user-api.test.ts
// Functional Tests for User API endpoints with Authentication

import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app';
import { createApp as createAuthApp } from '../../../auth-service/src/app';
import { connectDatabase, disconnectDatabase, UserModel } from '@yggdrasil/database-schemas';

describe('User API Functional Tests', () => {
  let app: any;
  let authApp: any;
  const testUserId = '507f1f77bcf86cd799439011';
  let userTokens: { accessToken: string; refreshToken: string };
  let adminTokens: { accessToken: string; refreshToken: string };

  beforeAll(async () => {
    // Connect to test database - single shared connection
    await connectDatabase(process.env['MONGODB_TEST_URI'] || 'mongodb://localhost:27018/yggdrasil-test');
    
    // Setup both user-service and auth-service apps - both will use the same database connection
    app = createApp();
    authApp = createAuthApp();
    
    // Remove existing test users - be more specific to avoid interfering with other tests
    await UserModel.findByIdAndDelete(testUserId);
    await UserModel.deleteMany({ email: { $regex: /^test@yggdrasil\.edu$/ } });
    await UserModel.deleteMany({ email: { $regex: /^admin@yggdrasil\.edu$/ } });
    
    // Create test user for API calls
    await UserModel.create({
      _id: new mongoose.Types.ObjectId(testUserId),
      email: 'test@yggdrasil.edu',
      password: 'TestPassword123!', // Let the User model's pre-save middleware handle password hashing
      role: 'student',
      profile: {
        firstName: 'Test',
        lastName: 'User',
        department: 'Computer Science'
      },
      preferences: {
        language: 'en',
        notifications: {
          scheduleChanges: true,
          newAnnouncements: true,
          assignmentReminders: true
        },
        accessibility: {
          colorblindMode: false,
          fontSize: 'medium',
          highContrast: false
        }
      },
      isActive: true
    });
    
    // Create admin user for admin-level tests
    await UserModel.create({
      email: 'admin@yggdrasil.edu',
      password: 'AdminPassword123!', // Let the User model's pre-save middleware handle password hashing
      role: 'admin',
      profile: {
        firstName: 'Admin',
        lastName: 'User'
      },
      isActive: true
    });
    
    // Wait a moment for database operations to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Login as regular user to get tokens
    const userLoginResponse = await request(authApp)
      .post('/api/auth/login')
      .send({
        email: 'test@yggdrasil.edu',
        password: 'TestPassword123!'
      });
    
    if (userLoginResponse.body.success) {
      userTokens = userLoginResponse.body.data.tokens;
    } else {
      throw new Error(`User login failed: ${userLoginResponse.body.error}`);
    }
    
    // Login as admin to get admin tokens
    const adminLoginResponse = await request(authApp)
      .post('/api/auth/login')
      .send({
        email: 'admin@yggdrasil.edu',
        password: 'AdminPassword123!'
      });
    
    if (adminLoginResponse.body.success) {
      adminTokens = adminLoginResponse.body.data.tokens;
    } else {
      throw new Error(`Admin login failed: ${adminLoginResponse.body.error}`);
    }
  });

  afterAll(async () => {
    // Clean up test data - be more specific to avoid interfering with other tests
    await UserModel.findByIdAndDelete(testUserId);
    await UserModel.deleteMany({ email: { $regex: /^test@yggdrasil\.edu$/ } });
    await UserModel.deleteMany({ email: { $regex: /^admin@yggdrasil\.edu$/ } });
    // Don't disconnect database - let Jest handle it to avoid conflicts with other tests
    // await disconnectDatabase();
  });

  describe('GET /api/users/:id', () => {
    it('should return user data for valid user ID with authentication', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.id).toBe(testUserId);
      expect(response.body.data.user.email).toBe('test@yggdrasil.edu');
    });

    it('should return 404 for non-existent user with admin token', async () => {
      const nonExistentId = '507f1f77bcf86cd799439999';
      
      const response = await request(app)
        .get(`/api/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    it('should return 403 for insufficient permissions when student accesses invalid user ID', async () => {
      const invalidId = 'invalid-id';
      
      const response = await request(app)
        .get(`/api/users/${invalidId}`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });

  describe('PATCH /api/users/:id/profile', () => {
    it('should update user profile successfully with authentication', async () => {
      const profileUpdate = {
        firstName: 'Updated',
        lastName: 'Name'
      };
      
      const response = await request(app)
        .patch(`/api/users/${testUserId}/profile`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .send(profileUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.profile.firstName).toBe('Updated');
      expect(response.body.data.user.profile.lastName).toBe('Name');
    });

    it('should return 400 for invalid profile data with authentication', async () => {
      const invalidUpdate = { firstName: '' };
      
      const response = await request(app)
        .patch(`/api/users/${testUserId}/profile`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid profile data');
    });
  });

  describe('GET /api/users/:id/preferences', () => {
    it('should return user preferences with authentication', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}/preferences`)
        .set('Authorization', `Bearer ${userTokens.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences).toBeDefined();
    });

    it('should return 404 for non-existent user preferences with admin token', async () => {
      const nonExistentId = '507f1f77bcf86cd799439999';
      
      const response = await request(app)
        .get(`/api/users/${nonExistentId}/preferences`)
        .set('Authorization', `Bearer ${adminTokens.accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });
    
    it('should require authentication for all endpoints', async () => {
      // Test that endpoints return 401 without auth token
      const unauthenticatedTests = [
        request(app).get(`/api/users/${testUserId}`),
        request(app).patch(`/api/users/${testUserId}/profile`).send({ firstName: 'Test' }),
        request(app).get(`/api/users/${testUserId}/preferences`)
      ];
      
      for (const testRequest of unauthenticatedTests) {
        const response = await testRequest;
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('No token provided');
      }
    });
  });
});