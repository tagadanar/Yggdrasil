import { Request, Response } from 'express';
import { PlanningService } from '../services/PlanningService';
import { ResponseHelper } from '@yggdrasil/shared-utilities';
import { planningValidationSchemas } from '@yggdrasil/shared-utilities';
import { AuthRequest } from '@yggdrasil/shared-utilities';

export class PlanningController {
  private static planningService = new PlanningService();

  static async getEvents(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { startDate, endDate, type, courseId } = req.query;
      
      const events = await PlanningController.planningService.getEvents({
        startDate: startDate as string,
        endDate: endDate as string,
        type: type as 'class' | 'exam' | 'meeting' | 'event' | undefined,
        courseId: courseId as string,
        userId: req.user!._id.toString()
      });

      const successResponse = ResponseHelper.success(events, 'Events retrieved successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async createEvent(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const validation = planningValidationSchemas.createEvent.safeParse(req.body);
      if (!validation.success) {
        const errorResponse = ResponseHelper.badRequest(validation.error.errors[0].message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const event = await PlanningController.planningService.createEvent(
        validation.data,
        req.user!
      );

      const successResponse = ResponseHelper.success(event, 'Event created successfully');
      return res.status(201).json(successResponse);
    } catch (error: any) {
      if (error.message.includes('Insufficient permissions') || error.message.includes('permissions')) {
        const errorResponse = ResponseHelper.forbidden(error.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }
      if (error.message.includes('conflict')) {
        const errorResponse = ResponseHelper.badRequest(error.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async getEvent(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { eventId } = req.params;
      
      const event = await PlanningController.planningService.getEvent(eventId);

      if (!event) {
        const errorResponse = ResponseHelper.notFound('Event not found');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const successResponse = ResponseHelper.success(event, 'Event retrieved successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async updateEvent(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { eventId } = req.params;
      const validation = planningValidationSchemas.updateEvent.safeParse(req.body);
      if (!validation.success) {
        const errorResponse = ResponseHelper.badRequest(validation.error.errors[0].message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const event = await PlanningController.planningService.updateEvent(
        eventId,
        validation.data,
        req.user!
      );

      const successResponse = ResponseHelper.success(event, 'Event updated successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        const errorResponse = ResponseHelper.notFound(error.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }
      if (error.message.includes('Insufficient permissions') || error.message.includes('permissions')) {
        const errorResponse = ResponseHelper.forbidden(error.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async deleteEvent(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { eventId } = req.params;

      await PlanningController.planningService.deleteEvent(eventId, req.user!);

      const successResponse = ResponseHelper.success(null, 'Event deleted successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        const errorResponse = ResponseHelper.notFound(error.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }
      if (error.message.includes('Insufficient permissions') || error.message.includes('permissions')) {
        const errorResponse = ResponseHelper.forbidden(error.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async checkConflicts(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { startDate, endDate, location, excludeEventId } = req.query;

      if (!startDate || !endDate) {
        const errorResponse = ResponseHelper.badRequest('Start date and end date are required');
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const conflicts = await PlanningController.planningService.checkConflicts({
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
        location: location as string,
        excludeEventId: excludeEventId as string
      });

      const successResponse = ResponseHelper.success(conflicts, 'Conflict check completed');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async exportCalendar(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const validation = planningValidationSchemas.exportCalendar.safeParse(req.body);
      if (!validation.success) {
        const errorResponse = ResponseHelper.badRequest(validation.error.errors[0].message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }

      const exportData = await PlanningController.planningService.exportCalendar(
        validation.data,
        req.user!
      );

      // Set appropriate headers for file download
      res.setHeader('Content-Type', exportData.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
      
      return res.send(exportData.content);
    } catch (error: any) {
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }

  static async generateRecurringInstances(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { eventId } = req.params;
      
      const instances = await PlanningController.planningService.generateRecurringInstances(
        eventId,
        req.user!
      );

      const successResponse = ResponseHelper.success(instances, 'Recurring instances generated successfully');
      return res.status(200).json(successResponse);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        const errorResponse = ResponseHelper.notFound(error.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }
      if (error.message.includes('Insufficient permissions') || error.message.includes('permissions')) {
        const errorResponse = ResponseHelper.forbidden(error.message);
        return res.status(errorResponse.statusCode).json(errorResponse);
      }
      const errorResponse = ResponseHelper.error(error.message);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  }
}