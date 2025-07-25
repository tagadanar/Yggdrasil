// packages/api-services/auth-service/src/routes/authRoutes.ts
// Authentication routes

import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateToken } from '../middleware/auth';
import { verifyToken } from '@yggdrasil/shared-utilities';

export const authRoutes = Router();

// Public routes (no authentication required)
authRoutes.post('/register', AuthController.register);
authRoutes.post('/login', AuthController.login);
authRoutes.post('/refresh', AuthController.refresh);
authRoutes.get('/registration-status', AuthController.registrationStatus);

// Protected routes (authentication required)
authRoutes.post('/logout', verifyToken, AuthController.logout);
authRoutes.get('/me', authenticateToken, AuthController.me);