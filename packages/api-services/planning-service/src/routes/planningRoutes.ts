import { Router } from 'express';
import { authenticate, requireRole, teacherAndAbove } from '../middleware/authMiddleware';
import { PlanningController } from '../controllers/PlanningController';

const router = Router();

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
router.get('/events', authenticate, PlanningController.getEvents);
router.post('/events', authenticate, teacherAndAbove, PlanningController.createEvent);
router.get('/events/:eventId', authenticate, PlanningController.getEvent);
router.put('/events/:eventId', authenticate, teacherAndAbove, PlanningController.updateEvent);
router.delete('/events/:eventId', authenticate, requireRole('admin'), PlanningController.deleteEvent);

// Conflict detection
router.get('/conflicts', authenticate, PlanningController.checkConflicts);

// Export functionality
router.post('/export', authenticate, PlanningController.exportCalendar);

// Recurring events
router.post('/events/:eventId/instances', authenticate, teacherAndAbove, PlanningController.generateRecurringInstances);

export default router;
