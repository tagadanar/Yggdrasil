import { Router } from 'express';
import { AuthMiddleware } from '@yggdrasil/shared-utilities';
import { UserModel } from '@yggdrasil/database-schemas';
import { PlanningController } from '../controllers/PlanningController';

const router = Router();

// Setup authentication middleware with user lookup
const authenticateWithUser = AuthMiddleware.verifyTokenWithUserLookup(async id =>
  UserModel.findById(id),
);

// Root route - public access for service info (like course service)
router.get('/', (req, res) => {
  return res.json({
    service: 'planning-service',
    message: 'Planning service is running',
    user: (req as any).user ? { id: (req as any).user._id, role: (req as any).user.role } : null,
    endpoints: {
      'GET /events': 'List all events',
      'POST /events': 'Create event (admin/staff)',
      'GET /events/:eventId': 'Get event by ID',
      'PUT /events/:eventId': 'Update event (admin/staff)',
      'DELETE /events/:eventId': 'Delete event (admin/staff)',
      'GET /conflicts': 'Check for conflicts',
      'POST /export': 'Export calendar',
    },
  });
});

// Events routes
router.get('/events', authenticateWithUser, PlanningController.getEvents);
router.post(
  '/events',
  authenticateWithUser,
  AuthMiddleware.requireRole('teacher', 'admin', 'staff'),
  PlanningController.createEvent,
);
router.get('/events/:eventId', authenticateWithUser, PlanningController.getEvent);
router.put(
  '/events/:eventId',
  authenticateWithUser,
  AuthMiddleware.requireRole('teacher', 'admin', 'staff'),
  PlanningController.updateEvent,
);
router.delete(
  '/events/:eventId',
  authenticateWithUser,
  AuthMiddleware.adminOnly,
  PlanningController.deleteEvent,
);

// Conflict detection
router.get('/conflicts', authenticateWithUser, PlanningController.checkConflicts);

// Export functionality
router.post('/export', authenticateWithUser, PlanningController.exportCalendar);

// Recurring events
router.post(
  '/events/:eventId/instances',
  authenticateWithUser,
  AuthMiddleware.requireRole('teacher', 'admin', 'staff'),
  PlanningController.generateRecurringInstances,
);

export default router;
