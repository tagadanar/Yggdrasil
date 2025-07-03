// Path: packages/api-services/auth-service/src/index.ts
export { AuthService } from './services/AuthService';
export { AuthController } from './controllers/AuthController';
export { authMiddleware, requireRole, optionalAuthMiddleware, requireOwnershipOrAdmin } from './middleware/authMiddleware';