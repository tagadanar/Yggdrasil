// packages/api-services/planning-service/src/routes/systemRoutes.ts
// System monitoring and database management routes

import { Router } from 'express';
import { AuthMiddleware } from '@yggdrasil/shared-utilities';
import SystemController from '../controllers/SystemController';
import { UserModel } from '@yggdrasil/database-schemas';

const router = Router();

// Apply authentication middleware to all routes
router.use(AuthMiddleware.verifyTokenWithUserLookup(async (id) => UserModel.findById(id)));

// System health endpoints (admin/staff only)
router.get('/health', 
  AuthMiddleware.staffOnly,
  SystemController.getSystemHealth.bind(SystemController)
);

router.get('/performance',
  AuthMiddleware.staffOnly,
  SystemController.getPerformanceMetrics.bind(SystemController)
);

// Database state endpoints (admin/staff only)
router.get('/database/state',
  AuthMiddleware.staffOnly,
  SystemController.getDatabaseState.bind(SystemController)
);

router.get('/database/integrity',
  AuthMiddleware.staffOnly,
  SystemController.checkIntegrity.bind(SystemController)
);

// Database management endpoints (admin only)
router.post('/database/seed',
  AuthMiddleware.adminOnly,
  SystemController.seedDatabase.bind(SystemController)
);

router.post('/database/reset',
  AuthMiddleware.adminOnly,
  SystemController.resetDatabase.bind(SystemController)
);

export { router as systemRoutes };