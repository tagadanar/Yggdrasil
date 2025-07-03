// Path: packages/api-services/user-service/src/routes/userRoutes.ts
import express from 'express';
import multer from 'multer';
import { UserController } from '../controllers/UserController';

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
router.get('/profile', UserController.getProfile);
router.get('/search', UserController.searchUsers);
router.put('/preferences', UserController.updatePreferences);
router.get('/:id', UserController.getProfile);
router.put('/:id', UserController.updateProfile);

// File upload
router.post('/upload-photo', upload.single('photo') as any, UserController.uploadPhoto);

// User activity
router.get('/:id/activity', UserController.getActivity);

// Admin operations
router.post('/:id/deactivate', UserController.deactivateUser);
router.post('/:id/reactivate', UserController.reactivateUser);

export default router;