import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { PlanningController } from '../controllers/PlanningController';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Root route - authenticated users can access planning service
router.get('/', (req, res) => {
  res.json({
    service: 'planning-service',
    message: 'Planning service is running',
    user: req.user ? { id: req.user._id, role: req.user.role } : null,
    endpoints: {
      'GET /events': 'List all events',
      'POST /events': 'Create event (admin/staff)',
      'GET /events/:eventId': 'Get event by ID',
      'PUT /events/:eventId': 'Update event (admin/staff)',
      'DELETE /events/:eventId': 'Delete event (admin/staff)',
      'GET /conflicts': 'Check for conflicts',
      'POST /export': 'Export calendar'
    }
  });
});

// Events routes
router.get('/events', PlanningController.getEvents);
router.post('/events', requireRole(['admin', 'staff']), PlanningController.createEvent);
router.get('/events/:eventId', PlanningController.getEvent);
router.put('/events/:eventId', requireRole(['admin', 'staff']), PlanningController.updateEvent);
router.delete('/events/:eventId', requireRole(['admin', 'staff']), PlanningController.deleteEvent);

// Conflict detection
router.get('/conflicts', PlanningController.checkConflicts);

// Export functionality
router.post('/export', PlanningController.exportCalendar);

// Recurring events
router.post('/events/:eventId/instances', requireRole(['admin', 'staff']), PlanningController.generateRecurringInstances);

export default router;