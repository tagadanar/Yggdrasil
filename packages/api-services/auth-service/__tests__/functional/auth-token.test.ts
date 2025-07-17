// packages/api-services/auth-service/__tests__/functional/auth-token.test.ts
// Functional tests for token refresh and logout workflows

import request from 'supertest';
import { createApp } from '../../src/app';
import { connectDatabase, disconnectDatabase, UserModel } from '@yggdrasil/database-schemas';
import { JWTHelper } from '../../src/utils/JWTHelper';
import { Application } from 'express';

describe('Auth Token Management Functional Tests', () => {
  let app: Application;
  let testUser: any;
  let validTokens: { accessToken: string; refreshToken: string };

  beforeAll(async () => {
    app = createApp();
    await connectDatabase(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27018/yggdrasil-test');
    
    // Create test user (let Mongoose handle password hashing)
    testUser = await UserModel.create({
      email: 'token.test@yggdrasil.edu',
      password: 'TokenTest123!',
      role: 'student',
      profile: {
        firstName: 'Token',
        lastName: 'Test',
        studentId: 'STU333333'
      },
      isActive: true
    });

    // Get valid tokens by logging in
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'token.test@yggdrasil.edu',
        password: 'TokenTest123!'
      });
    
    if (loginResponse.status !== 200) {
      console.error('Login failed:', loginResponse.status, loginResponse.body);
      throw new Error(`Login failed with status ${loginResponse.status}: ${JSON.stringify(loginResponse.body)}`);
    }
    
    validTokens = loginResponse.body.data.tokens;
  });

  afterAll(async () => {
    await UserModel.findByIdAndDelete(testUser._id);
    await disconnectDatabase();
  });

  describe('POST /api/auth/refresh - Token Refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      // Add a small delay to ensure different iat timestamps
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validTokens.refreshToken
        });
        
      if (response.status !== 200) {
        console.error('Refresh failed:', response.status, response.body);
      }
      
      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Tokens refreshed successfully');
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
      
      // New tokens should be different from old ones (due to different iat timestamp)
      expect(response.body.data.tokens.accessToken).not.toBe(validTokens.accessToken);
      expect(response.body.data.tokens.refreshToken).not.toBe(validTokens.refreshToken);
    });

    it('should fail refresh with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid.refresh.token'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token');
    });

    it('should fail refresh with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should fail refresh with access token instead of refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validTokens.accessToken
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token');
    });

    it('should fail refresh if user is deactivated', async () => {
      // Deactivate user
      await UserModel.findByIdAndUpdate(testUser._id, { isActive: false });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validTokens.refreshToken
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('locked');

      // Reactivate user for other tests
      await UserModel.findByIdAndUpdate(testUser._id, { isActive: true });
    });

    it('should fail refresh with expired refresh token', async () => {
      // Create an expired refresh token
      const expiredToken = JWTHelper.generateRefreshToken({
        id: testUser._id.toString(),
        userId: testUser._id.toString(),
        tokenVersion: testUser.tokenVersion
      }, '-1s'); // Already expired

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: expiredToken
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token');
    });

    it('should fail refresh if token version mismatches', async () => {
      // Increment user's token version (simulating logout from all devices)
      await testUser.incrementTokenVersion();

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: validTokens.refreshToken
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token');
    });
  });

  describe('POST /api/auth/logout - Logout', () => {
    let freshTokens: { accessToken: string; refreshToken: string };

    beforeEach(async () => {
      // Get fresh tokens for each test
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'token.test@yggdrasil.edu',
          password: 'TokenTest123!'
        });
      
      freshTokens = loginResponse.body.data.tokens;
    });

    it('should successfully logout with valid access token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${freshTokens.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logout successful');

      // Token should be invalidated - try to use it
      const protectedResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${freshTokens.accessToken}`)
        .expect(401);

      expect(protectedResponse.body.error).toContain('Invalid token');
    });

    it('should invalidate refresh token after logout', async () => {
      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${freshTokens.accessToken}`)
        .expect(200);

      // Try to refresh with the old refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: freshTokens.refreshToken
        })
        .expect(401);

      expect(refreshResponse.body.error).toContain('Invalid token');
    });

    it('should fail logout without authorization header', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access token is required');
    });

    it('should fail logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token');
    });

    it('should fail logout with refresh token instead of access token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${freshTokens.refreshToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token');
    });
  });

  describe('GET /api/auth/me - Protected Route', () => {
    it('should access protected route with valid access token', async () => {
      // Get fresh tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'token.test@yggdrasil.edu',
          password: 'TokenTest123!'
        });
      
      const { accessToken } = loginResponse.body.data.tokens;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('token.test@yggdrasil.edu');
      expect(response.body.data.user.role).toBe('student');
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should fail to access protected route without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access token is required');
    });

    it('should fail with expired access token', async () => {
      // Create an expired access token
      const expiredToken = JWTHelper.generateAccessToken({
        id: testUser._id.toString(),
        userId: testUser._id.toString(),
        email: testUser.email,
        role: testUser.role as any,
        tokenVersion: testUser.tokenVersion
      }, '-1s'); // Already expired

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token');
    });

    it('should fail with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access token is required');
    });

    it('should fail with refresh token in authorization header', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'token.test@yggdrasil.edu',
          password: 'TokenTest123!'
        });
      
      const { refreshToken } = loginResponse.body.data.tokens;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token');
    });
  });

  describe('Token Security Features', () => {
    it('should not accept tokens signed with wrong secret', async () => {
      // This would need to be a token signed with a different secret
      const wrongSecretToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoic3R1ZGVudCIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE2MzYwNDEyMDAsImV4cCI6OTk5OTk5OTk5OX0.invalid-signature';

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${wrongSecretToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid token');
    });

    it('should handle concurrent refresh requests gracefully', async () => {
      // Get fresh tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'token.test@yggdrasil.edu',
          password: 'TokenTest123!'
        });
      
      const { refreshToken } = loginResponse.body.data.tokens;

      // Make multiple concurrent refresh requests
      const refreshPromises = [];
      for (let i = 0; i < 5; i++) {
        refreshPromises.push(
          request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken })
        );
      }

      const responses = await Promise.all(refreshPromises);

      // At least one should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThanOrEqual(1);

      // Others might fail due to token version mismatch (race condition)
      const failedResponses = responses.filter(r => r.status !== 200);
      failedResponses.forEach(response => {
        expect(response.status).toBe(401);
      });
    });
  });
});