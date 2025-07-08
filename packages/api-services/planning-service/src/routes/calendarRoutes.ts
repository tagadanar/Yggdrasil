// Path: packages/api-services/planning-service/src/routes/calendarRoutes.ts
import express from 'express';
import { CalendarController } from '../controllers/CalendarController';
import { authMiddleware, requireRole, optionalAuth } from '../middleware/authMiddleware';

const router = express.Router();

// Event management routes (authenticated users)
router.post('/events', authMiddleware, CalendarController.createEvent);
router.get('/events', authMiddleware, CalendarController.searchEvents);
router.get('/events/upcoming', authMiddleware, CalendarController.getUpcomingEvents);
router.get('/events/today', authMiddleware, CalendarController.getTodayEvents);
router.get('/events/week', authMiddleware, CalendarController.getWeekEvents);
router.get('/events/:eventId', optionalAuth, CalendarController.getEvent);
router.put('/events/:eventId', authMiddleware, CalendarController.updateEvent);
router.delete('/events/:eventId', authMiddleware, CalendarController.deleteEvent);

// Event attendance (authenticated users)
router.post('/events/:eventId/attendance', authMiddleware, CalendarController.toggleEventAttendance);

// Calendar views (authenticated users)
router.get('/view/:viewType', authMiddleware, CalendarController.getCalendarView);

// Availability and booking (authenticated users)
router.get('/availability/:userId?', authMiddleware, CalendarController.getAvailability);
router.post('/book', authMiddleware, CalendarController.bookSlot);

// Statistics (admin/staff only)
router.get('/stats', authMiddleware, requireRole(['admin', 'staff']), CalendarController.getCalendarStats);

export default router;