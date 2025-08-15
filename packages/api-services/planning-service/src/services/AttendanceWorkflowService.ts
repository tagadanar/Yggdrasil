// packages/api-services/planning-service/src/services/AttendanceWorkflowService.ts
// Automated attendance workflow management and alerting system

import cron from 'node-cron';
import {
  EventModel,
  PromotionModel,
  UserModel,
  EventAttendanceModel,
  PromotionProgressModel,
} from '@yggdrasil/database-schemas';
// import { ProgressTrackingService } from './ProgressTrackingService'; // Reserved for future attendance progress integration
import { logger } from '@yggdrasil/shared-utilities';
import { Types } from 'mongoose';

interface AttendanceAlert {
  type: 'low_attendance' | 'consecutive_absences' | 'missing_attendance' | 'trend_declining';
  studentId: string;
  studentName: string;
  studentEmail: string;
  promotionId: string;
  promotionName: string;
  severity: 'high' | 'medium' | 'low';
  details: string;
  threshold: number;
  currentValue: number;
  recommendations: string[];
}

interface WorkflowConfig {
  lowAttendanceThreshold: number; // e.g., 75%
  consecutiveAbsenceLimit: number; // e.g., 3
  missingAttendanceHours: number; // e.g., 24 hours after event
  trendAnalysisPeriod: number; // e.g., 14 days
  enabledAlerts: string[];
  notificationChannels: string[];
  autoMarkingEnabled: boolean;
}

interface AttendanceNotification {
  recipientId: string;
  recipientEmail: string;
  type: 'student' | 'teacher' | 'admin';
  subject: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  data: any;
}

export class AttendanceWorkflowService {
  // private _progressService: ProgressTrackingService; // Reserved for future attendance progress integration
  private config: WorkflowConfig;
  private isRunning = false;
  private jobSchedules: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    // this._progressService = new ProgressTrackingService(); // Reserved for future use
    this.config = this.getDefaultConfig();
  }

  private getDefaultConfig(): WorkflowConfig {
    return {
      lowAttendanceThreshold: 75,
      consecutiveAbsenceLimit: 3,
      missingAttendanceHours: 24,
      trendAnalysisPeriod: 14,
      enabledAlerts: ['low_attendance', 'consecutive_absences', 'missing_attendance'],
      notificationChannels: ['email', 'dashboard'],
      autoMarkingEnabled: false,
    };
  }

  /**
   * Start the attendance workflow automation
   */
  async startWorkflows(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Attendance workflows already running');
      return;
    }

    try {
      this.isRunning = true;
      logger.info('🚀 Starting attendance workflow automation');

      // Daily attendance check at 8 AM
      this.scheduleJob('daily-check', '0 8 * * *', () => this.runDailyAttendanceCheck());

      // Hourly missing attendance check
      this.scheduleJob('hourly-missing', '0 * * * *', () => this.checkMissingAttendance());

      // Weekly trend analysis on Sundays at 10 AM
      this.scheduleJob('weekly-trends', '0 10 * * 0', () => this.analyzeAttendanceTrends());

      // Real-time alert processing every 15 minutes
      this.scheduleJob('alert-processing', '*/15 * * * *', () => this.processAlerts());

      logger.info('✅ Attendance workflow automation started');
    } catch (error) {
      logger.error('❌ Failed to start attendance workflows:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop all attendance workflows
   */
  stopWorkflows(): void {
    logger.info('🛑 Stopping attendance workflow automation');

    for (const [name, task] of this.jobSchedules.entries()) {
      task.stop();
      logger.info(`Stopped job: ${name}`);
    }

    this.jobSchedules.clear();
    this.isRunning = false;
    logger.info('✅ Attendance workflow automation stopped');
  }

  /**
   * Schedule a cron job
   */
  private scheduleJob(name: string, schedule: string, callback: () => Promise<void>): void {
    const task = cron.schedule(
      schedule,
      async () => {
        try {
          logger.info(`📅 Running scheduled job: ${name}`);
          await callback();
          logger.info(`✅ Completed job: ${name}`);
        } catch (error) {
          logger.error(`❌ Job failed: ${name}`, error);
        }
      },
      {
        scheduled: true,
        timezone: 'UTC',
      },
    );

    this.jobSchedules.set(name, task);
    logger.info(`📋 Scheduled job: ${name} with cron: ${schedule}`);
  }

  /**
   * Daily attendance check for all active promotions
   */
  private async runDailyAttendanceCheck(): Promise<void> {
    logger.info('🔍 Running daily attendance check');

    try {
      // Get all active promotions
      const promotions = await PromotionModel.find({ status: 'active' });

      for (const promotion of promotions) {
        await this.checkPromotionAttendance(promotion._id);
      }

      logger.info(`✅ Daily attendance check completed for ${promotions.length} promotions`);
    } catch (error) {
      logger.error('❌ Daily attendance check failed:', error);
    }
  }

  /**
   * Check attendance for a specific promotion
   */
  private async checkPromotionAttendance(promotionId: Types.ObjectId): Promise<AttendanceAlert[]> {
    const alerts: AttendanceAlert[] = [];

    try {
      // Get promotion progress for all students
      const progressRecords = await PromotionProgressModel.find({ promotionId });
      const promotion = await PromotionModel.findById(promotionId);

      if (!promotion) return alerts;

      for (const progress of progressRecords) {
        const student = await UserModel.findById(progress.studentId);
        if (!student) continue;

        // Check low attendance
        if (this.config.enabledAlerts.includes('low_attendance')) {
          if (progress.attendanceRate < this.config.lowAttendanceThreshold) {
            alerts.push({
              type: 'low_attendance',
              studentId: student._id.toString(),
              studentName: `${student.profile.firstName} ${student.profile.lastName}`,
              studentEmail: student.email,
              promotionId: promotion._id.toString(),
              promotionName: promotion.name,
              severity: progress.attendanceRate < 50 ? 'high' : 'medium',
              details: `Attendance rate is ${progress.attendanceRate.toFixed(1)}%, below the required ${this.config.lowAttendanceThreshold}%`,
              threshold: this.config.lowAttendanceThreshold,
              currentValue: progress.attendanceRate,
              recommendations: [
                'Schedule a meeting with the student',
                'Review recent attendance patterns',
                'Provide additional support if needed',
                'Consider academic counseling',
              ],
            });
          }
        }

        // Check consecutive absences
        if (this.config.enabledAlerts.includes('consecutive_absences')) {
          const consecutiveAbsences = await this.getConsecutiveAbsences(
            student._id as any,
            promotionId,
          );

          if (consecutiveAbsences >= this.config.consecutiveAbsenceLimit) {
            alerts.push({
              type: 'consecutive_absences',
              studentId: student._id.toString(),
              studentName: `${student.profile.firstName} ${student.profile.lastName}`,
              studentEmail: student.email,
              promotionId: promotion._id.toString(),
              promotionName: promotion.name,
              severity: consecutiveAbsences >= 5 ? 'high' : 'medium',
              details: `${consecutiveAbsences} consecutive absences detected`,
              threshold: this.config.consecutiveAbsenceLimit,
              currentValue: consecutiveAbsences,
              recommendations: [
                'Contact student immediately',
                'Check for personal issues',
                'Review academic standing',
                'Consider intervention measures',
              ],
            });
          }
        }
      }

      if (alerts.length > 0) {
        logger.info(`🚨 Generated ${alerts.length} alerts for promotion: ${promotion.name}`);
      }
    } catch (error) {
      logger.error(`❌ Failed to check attendance for promotion ${promotionId}:`, error);
    }

    return alerts;
  }

  /**
   * Check for missing attendance records
   */
  private async checkMissingAttendance(): Promise<void> {
    logger.info('📋 Checking for missing attendance records');

    try {
      const cutoffTime = new Date(Date.now() - this.config.missingAttendanceHours * 60 * 60 * 1000);

      // Find events that ended before cutoff time but have no attendance records
      const eventsWithoutAttendance = await EventModel.aggregate([
        {
          $match: {
            endDate: { $lt: cutoffTime },
            isPublic: false,
          },
        },
        {
          $lookup: {
            from: 'eventattendances',
            localField: '_id',
            foreignField: 'eventId',
            as: 'attendance',
          },
        },
        {
          $match: {
            attendance: { $size: 0 },
          },
        },
      ]);

      for (const event of eventsWithoutAttendance) {
        // Get teacher/admin for notification
        const teacher = await UserModel.findById(event.teacherId);

        if (teacher) {
          const notification: AttendanceNotification = {
            recipientId: teacher._id.toString(),
            recipientEmail: teacher.email,
            type: 'teacher',
            subject: 'Missing Attendance Record',
            message: `Please mark attendance for event "${event.title}" which ended on ${new Date(event.endDate).toLocaleString()}`,
            priority: 'medium',
            data: {
              eventId: event._id,
              eventTitle: event.title,
              eventDate: event.endDate,
            },
          };

          await this.sendNotification(notification);
        }
      }

      logger.info(`✅ Found ${eventsWithoutAttendance.length} events with missing attendance`);
    } catch (error) {
      logger.error('❌ Failed to check missing attendance:', error);
    }
  }

  /**
   * Analyze attendance trends over time
   */
  private async analyzeAttendanceTrends(): Promise<void> {
    logger.info('📈 Analyzing attendance trends');

    try {
      const promotions = await PromotionModel.find({ status: 'active' });

      for (const promotion of promotions) {
        const trendAnalysis = await this.calculateAttendanceTrend(promotion._id);

        if (trendAnalysis.isDecreasing && trendAnalysis.severity === 'high') {
          // Generate trend alert
          const alert: AttendanceAlert = {
            type: 'trend_declining',
            studentId: 'promotion-wide',
            studentName: 'Multiple Students',
            studentEmail: '',
            promotionId: promotion._id.toString(),
            promotionName: promotion.name,
            severity: 'high',
            details: `Promotion-wide attendance declining by ${trendAnalysis.declineRate.toFixed(1)}% over ${this.config.trendAnalysisPeriod} days`,
            threshold: 0,
            currentValue: trendAnalysis.declineRate,
            recommendations: [
              'Review recent events and curriculum',
              'Survey students for feedback',
              'Consider schedule adjustments',
              'Implement engagement strategies',
            ],
          };

          // Notify administrators
          const admins = await UserModel.find({ role: 'admin' });
          for (const admin of admins) {
            const notification: AttendanceNotification = {
              recipientId: admin._id.toString(),
              recipientEmail: admin.email,
              type: 'admin',
              subject: 'Attendance Trend Alert',
              message: alert.details,
              priority: 'high',
              data: alert,
            };

            await this.sendNotification(notification);
          }
        }
      }

      logger.info('✅ Attendance trend analysis completed');
    } catch (error) {
      logger.error('❌ Attendance trend analysis failed:', error);
    }
  }

  /**
   * Process and send alerts
   */
  private async processAlerts(): Promise<void> {
    // This method processes any pending alerts and sends notifications
    // In a real implementation, you might have an alerts queue
    logger.debug('📤 Processing attendance alerts');
  }

  /**
   * Get consecutive absences for a student
   */
  private async getConsecutiveAbsences(
    studentId: Types.ObjectId,
    promotionId: Types.ObjectId,
  ): Promise<number> {
    const recentAttendance = await EventAttendanceModel.find({
      studentId,
      promotionId,
    })
      .sort({ createdAt: -1 })
      .limit(10);

    let consecutiveCount = 0;
    for (const record of recentAttendance) {
      if (!record.attended) {
        consecutiveCount++;
      } else {
        break;
      }
    }

    return consecutiveCount;
  }

  /**
   * Calculate attendance trend for a promotion
   */
  private async calculateAttendanceTrend(promotionId: Types.ObjectId): Promise<{
    isDecreasing: boolean;
    declineRate: number;
    severity: 'low' | 'medium' | 'high';
  }> {
    // Simplified trend calculation
    // In a real implementation, you'd use more sophisticated time series analysis

    const startDate = new Date(Date.now() - this.config.trendAnalysisPeriod * 24 * 60 * 60 * 1000);
    const midDate = new Date(
      Date.now() - (this.config.trendAnalysisPeriod / 2) * 24 * 60 * 60 * 1000,
    );

    const firstHalfEvents = await EventAttendanceModel.find({
      promotionId,
      createdAt: { $gte: startDate, $lt: midDate },
    });

    const secondHalfEvents = await EventAttendanceModel.find({
      promotionId,
      createdAt: { $gte: midDate },
    });

    const firstHalfRate =
      firstHalfEvents.length > 0
        ? (firstHalfEvents.filter(e => e.attended).length / firstHalfEvents.length) * 100
        : 100;

    const secondHalfRate =
      secondHalfEvents.length > 0
        ? (secondHalfEvents.filter(e => e.attended).length / secondHalfEvents.length) * 100
        : 100;

    const declineRate = firstHalfRate - secondHalfRate;
    const isDecreasing = declineRate > 5; // 5% decline threshold

    let severity: 'low' | 'medium' | 'high' = 'low';
    if (declineRate > 20) severity = 'high';
    else if (declineRate > 10) severity = 'medium';

    return { isDecreasing, declineRate, severity };
  }

  /**
   * Send notification to recipient
   */
  private async sendNotification(notification: AttendanceNotification): Promise<void> {
    try {
      // Log notification (in production, integrate with email service)
      logger.info(
        `📧 Sending ${notification.priority} priority notification to ${notification.recipientEmail}`,
      );
      logger.info(`Subject: ${notification.subject}`);
      logger.info(`Message: ${notification.message}`);

      // Notification service integration point
      // Currently logging notifications - extend this method to integrate with:
      // - Email service (SendGrid, AWS SES, etc.)
      // - SMS service for high priority alerts
      // - Push notifications for mobile app
      // - Dashboard notifications

      try {
        // Placeholder for actual notification delivery
        // In production, this would call the notification service API
        logger.info(
          `Notification queued for delivery: ${notification.type} to ${notification.recipientEmail}`,
        );
        // Placeholder implementation - in production this would return actual notification result
      } catch (error) {
        logger.error('Failed to queue notification:', error);
        // Error handling - in production this would be handled by notification service
      }

      // For now, we'll store in a notifications collection or queue
      // await NotificationModel.create(notification);
    } catch (error) {
      logger.error('❌ Failed to send notification:', error);
    }
  }

  /**
   * Update workflow configuration
   */
  updateConfig(newConfig: Partial<WorkflowConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('⚙️ Attendance workflow configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): WorkflowConfig {
    return { ...this.config };
  }

  /**
   * Manual trigger for attendance check
   */
  async triggerAttendanceCheck(promotionId?: string): Promise<AttendanceAlert[]> {
    logger.info(
      `🔍 Manual attendance check triggered${promotionId ? ` for promotion ${promotionId}` : ' for all promotions'}`,
    );

    try {
      if (promotionId) {
        return await this.checkPromotionAttendance(new Types.ObjectId(promotionId));
      } else {
        const allAlerts: AttendanceAlert[] = [];
        const promotions = await PromotionModel.find({ status: 'active' });

        for (const promotion of promotions) {
          const alerts = await this.checkPromotionAttendance(promotion._id);
          allAlerts.push(...alerts);
        }

        return allAlerts;
      }
    } catch (error) {
      logger.error('❌ Manual attendance check failed:', error);
      throw error;
    }
  }

  /**
   * Get workflow status
   */
  getStatus(): {
    isRunning: boolean;
    activeJobs: string[];
    config: WorkflowConfig;
  } {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobSchedules.keys()),
      config: this.config,
    };
  }
}
