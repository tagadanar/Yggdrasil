// Path: packages/api-services/auth-service/__tests__/controllers/AuthController.test.ts
import request from 'supertest';
import express from 'express';
import { AuthController } from '../../src/controllers/AuthController';
import { UserModel } from '../../../../database-schemas/src';

describe('AuthController', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Setup routes
    app.post('/register', AuthController.register);
    app.post('/login', AuthController.login);
    app.post('/refresh', AuthController.refreshToken);
    app.post('/forgot-password', AuthController.forgotPassword);
    app.post('/reset-password', AuthController.resetPassword);
    app.post('/logout', AuthController.logout);
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
  });

  const validUserData = {
    email: 'test@example.com',
    password: 'Password123!',
    role: 'student',
    profile: {
      firstName: 'Test',
      lastName: 'User',
    },
  };

  describe('POST /register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should return 400 for invalid email', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      const response = await request(app)
        .post('/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should return 400 for weak password', async () => {
      const invalidData = { ...validUserData, password: 'weak' };

      const response = await request(app)
        .post('/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Password');
    });

    it('should return 409 for duplicate email', async () => {
      // Register first user
      await request(app)
        .post('/register')
        .send(validUserData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/register')
        .send(validUserData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = { email: 'test@example.com' };

      const response = await request(app)
        .post('/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /login', () => {
    beforeEach(async () => {
      // Register a test user
      await request(app)
        .post('/register')
        .send(validUserData);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: validUserData.email,
          password: validUserData.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.tokens).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: validUserData.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'nonexistent@example.com',
          password: validUserData.password,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: validUserData.email,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/register')
        .send(validUserData);
      
      refreshToken = registerResponse.body.data.tokens.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid refresh token');
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /forgot-password', () => {
    beforeEach(async () => {
      await request(app)
        .post('/register')
        .send(validUserData);
    });

    it('should generate reset token for valid email', async () => {
      const response = await request(app)
        .post('/forgot-password')
        .send({ email: validUserData.email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resetToken).toBeDefined();
    });

    it('should return success for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should not reveal if email exists
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /reset-password', () => {
    let resetToken: string;

    beforeEach(async () => {
      await request(app)
        .post('/register')
        .send(validUserData);

      const forgotResponse = await request(app)
        .post('/forgot-password')
        .send({ email: validUserData.email });

      resetToken = forgotResponse.body.data.resetToken;
    });

    it('should reset password with valid token', async () => {
      const newPassword = 'NewPassword123!';

      const response = await request(app)
        .post('/reset-password')
        .send({ token: resetToken, newPassword })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/login')
        .send({ email: validUserData.email, password: newPassword });

      expect(loginResponse.status).toBe(200);
    });

    it('should return 401 for invalid reset token', async () => {
      const response = await request(app)
        .post('/reset-password')
        .send({ token: 'invalid-token', newPassword: 'NewPassword123!' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid reset token');
    });

    it('should return 400 for weak new password', async () => {
      const response = await request(app)
        .post('/reset-password')
        .send({ token: resetToken, newPassword: 'weak' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Password');
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/reset-password')
        .send({ token: resetToken })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out');
    });
  });
});