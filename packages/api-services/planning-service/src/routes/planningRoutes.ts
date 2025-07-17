import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { PlanningController } from '../controllers/PlanningController';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

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