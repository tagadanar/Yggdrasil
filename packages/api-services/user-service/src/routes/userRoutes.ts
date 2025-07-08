// Path: packages/api-services/user-service/src/routes/userRoutes.ts
import express from 'express';
import multer from 'multer';
import { UserController } from '../controllers/UserController';
import { authMiddleware, requireRole, optionalAuth } from '../middleware/authMiddleware';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

// User profile routes
router.get('/profile', authMiddleware, UserController.getProfile);
router.get('/search', authMiddleware, UserController.searchUsers);
router.put('/profile', authMiddleware, UserController.updateProfile);
router.put('/preferences', authMiddleware, UserController.updatePreferences);

// Public user profile (with optional auth for additional info)
router.get('/:id', optionalAuth, UserController.getProfile);

// Admin-only profile updates
router.put('/:id', authMiddleware, requireRole(['admin']), UserController.updateProfile);

// File upload
router.post('/photo', authMiddleware, upload.single('photo') as any, UserController.uploadPhoto);

// User activity
router.get('/activity', authMiddleware, UserController.getActivity);
router.get('/:id/activity', authMiddleware, UserController.getActivity);

// Admin operations
router.put('/:id/deactivate', authMiddleware, requireRole(['admin']), UserController.deactivateUser);
router.put('/:id/reactivate', authMiddleware, requireRole(['admin']), UserController.reactivateUser);

export default router;