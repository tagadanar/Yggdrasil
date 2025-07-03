// Path: packages/api-services/auth-service/__tests__/middleware/authMiddleware.test.ts
import request from 'supertest';
import express from 'express';
import { authMiddleware, requireRole } from '../../src/middleware/authMiddleware';
import { AuthService } from '../../src/services/AuthService';

describe('Auth Middleware', () => {
  let app: express.Application;
  let accessToken: string;
  let adminToken: string;
  let userId: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());

    // Test routes
    app.get('/protected', authMiddleware, (req, res) => {
      res.json({ success: true, user: (req as any).user });
    });

    app.get('/admin-only', authMiddleware, requireRole(['admin']), (req, res) => {
      res.json({ success: true, message: 'Admin access granted' });
    });

    app.get('/staff-only', authMiddleware, requireRole(['admin', 'staff']), (req, res) => {
      res.json({ success: true, message: 'Staff access granted' });
    });
  });

  beforeEach(async () => {
    // Create test users and tokens for each test
    const studentResult = await AuthService.register({
      email: `student-${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'student',
      profile: { firstName: 'Test', lastName: 'Student' }
    });

    const adminResult = await AuthService.register({
      email: `admin-${Date.now()}@example.com`,
      password: 'Password123!',
      role: 'admin',
      profile: { firstName: 'Test', lastName: 'Admin' }
    });

    accessToken = studentResult.tokens!.accessToken;
    adminToken = adminResult.tokens!.accessToken;
    userId = (studentResult.user!._id as any).toString();
  });

  describe('authMiddleware', () => {
    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user._id).toBe(userId);
    });

    it('should deny access without token', async () => {
      const response = await request(app)
        .get('/protected')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access token required');
    });

    it('should deny access with invalid token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid access token');
    });

    it('should deny access with malformed authorization header', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access token required');
    });

    it('should deny access with missing Bearer prefix', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', accessToken)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Access token required');
    });
  });

  describe('requireRole middleware', () => {
    it('should allow admin access to admin-only route', async () => {
      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Admin access granted');
    });

    it('should deny student access to admin-only route', async () => {
      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should allow admin access to staff-only route', async () => {
      const response = await request(app)
        .get('/staff-only')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Staff access granted');
    });

    it('should deny student access to staff-only route', async () => {
      const response = await request(app)
        .get('/staff-only')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });

  describe('middleware error handling', () => {
    it('should handle middleware errors gracefully', async () => {
      // Mock AuthService.validateAccessToken to throw an error
      const originalValidate = AuthService.validateAccessToken;
      AuthService.validateAccessToken = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Internal server error');

      // Restore original function
      AuthService.validateAccessToken = originalValidate;
    });
  });
});