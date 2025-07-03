// Path: packages/api-services/planning-service/src/routes/calendarRoutes.ts
import express from 'express';
import { CalendarController } from '../controllers/CalendarController';

const router = express.Router();

// Event management routes
router.post('/events', CalendarController.createEvent);
router.get('/events', CalendarController.searchEvents);
router.get('/events/upcoming', CalendarController.getUpcomingEvents);
router.get('/events/today', CalendarController.getTodayEvents);
router.get('/events/week', CalendarController.getWeekEvents);
router.get('/events/:eventId', CalendarController.getEvent);
router.put('/events/:eventId', CalendarController.updateEvent);
router.delete('/events/:eventId', CalendarController.deleteEvent);

// Event attendance
router.post('/events/:eventId/attendance', CalendarController.toggleEventAttendance);

// Calendar views
router.get('/view/:viewType', CalendarController.getCalendarView);

// Availability and booking
router.get('/availability/:userId?', CalendarController.getAvailability);
router.post('/book', CalendarController.bookSlot);

// Statistics
router.get('/stats', CalendarController.getCalendarStats);

export default router;