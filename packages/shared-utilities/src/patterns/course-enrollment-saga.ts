// packages/shared-utilities/src/patterns/course-enrollment-saga.ts
import { Saga, SagaStep } from './saga';
import { EventBus } from '../events/event-bus';
import { ServiceClientFactory } from './service-client';
import { logger } from '../logging/logger';

/**
 * Data structure for course enrollment saga.
 */
export interface CourseEnrollmentData {
  userId: string;
  courseId: string;
  amount: number;
  currency: string;
  enrolledBy: string;

  // Fields populated during saga execution
  paymentId?: string;
  enrollmentId?: string;
  reservationId?: string;
  prerequisites?: {
    met: boolean;
    missing: string[];
  };
}

/**
 * Course Enrollment Saga - Demonstrates distributed transaction pattern
 * for enrolling a user in a course with payment processing.
 *
 * This saga coordinates multiple services:
 * - Course Service: Check prerequisites and capacity
 * - Payment Service: Process payment
 * - Enrollment Service: Create enrollment record
 * - Notification Service: Send confirmation
 *
 * If any step fails, previous steps are compensated to maintain consistency.
 *
 * @example
 * ```typescript
 * const saga = new CourseEnrollmentSaga(eventBus, 'enroll-123');
 * const result = await saga.execute({
 *   userId: 'user-456',
 *   courseId: 'course-789',
 *   amount: 99.99,
 *   currency: 'USD',
 *   enrolledBy: 'user-456'
 * });
 * ```
 */
export class CourseEnrollmentSaga extends Saga<CourseEnrollmentData> {
  protected steps: SagaStep<CourseEnrollmentData>[] = [
    {
      name: 'check-prerequisites',
      execute: async (data: CourseEnrollmentData) => {
        logger.info(`Checking prerequisites for user ${data.userId} and course ${data.courseId}`);

        const courseClient = ServiceClientFactory.getCourseServiceClient();
        const userClient = ServiceClientFactory.getUserServiceClient();

        // Get course prerequisites
        const course = (await courseClient.get(`/courses/${data.courseId}`)) as any;
        if (!course) {
          throw new Error(`Course ${data.courseId} not found`);
        }

        // Get user's completed courses
        const userProgress = (await userClient.get(`/users/${data.userId}/progress`)) as any;

        // Check prerequisites
        const prerequisites = course.prerequisites || [];
        const completedCourses = userProgress?.completedCourses || [];

        const missingPrereqs = prerequisites.filter(
          (prereq: string) => !completedCourses.includes(prereq),
        );

        const prereqData = {
          met: missingPrereqs.length === 0,
          missing: missingPrereqs,
        };

        if (!prereqData.met) {
          throw new Error(`Prerequisites not met: ${prereqData.missing.join(', ')}`);
        }

        logger.info(`Prerequisites check passed for user ${data.userId}`);
        return { prerequisites: prereqData };
      },
      compensate: async (_data: CourseEnrollmentData) => {
        // No compensation needed for prerequisite check
        logger.debug('No compensation needed for prerequisites check');
      },
      timeout: 5000,
      retryable: true,
      maxRetries: 2,
    },

    {
      name: 'check-capacity-and-reserve',
      execute: async (data: CourseEnrollmentData) => {
        logger.info(`Checking capacity and reserving seat for course ${data.courseId}`);

        const courseClient = ServiceClientFactory.getCourseServiceClient();

        // Check course capacity
        const capacity = (await courseClient.get(`/courses/${data.courseId}/capacity`)) as any;
        if (!capacity.available || capacity.remaining <= 0) {
          throw new Error(`Course ${data.courseId} is full`);
        }

        // Reserve a seat (this should be atomic)
        const reservation = (await courseClient.post(`/courses/${data.courseId}/reservations`, {
          userId: data.userId,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        })) as any;

        logger.info(`Seat reserved for user ${data.userId} in course ${data.courseId}`, {
          reservationId: reservation.id,
        });

        return { reservationId: reservation.id };
      },
      compensate: async (data: CourseEnrollmentData) => {
        if (data.reservationId) {
          logger.info(`Releasing reserved seat: ${data.reservationId}`);

          try {
            const courseClient = ServiceClientFactory.getCourseServiceClient();
            await courseClient.delete(
              `/courses/${data.courseId}/reservations/${data.reservationId}`,
            );

            logger.info(`Seat reservation released: ${data.reservationId}`);
          } catch (error) {
            logger.error(`Failed to release seat reservation ${data.reservationId}:`, error);
          }
        }
      },
      timeout: 10000,
      retryable: true,
      maxRetries: 3,
    },

    {
      name: 'process-payment',
      execute: async (data: CourseEnrollmentData) => {
        logger.info(`Processing payment for user ${data.userId}`, {
          amount: data.amount,
          currency: data.currency,
        });

        // For this example, we'll simulate payment processing
        // In reality, this would integrate with Stripe, PayPal, etc.
        const paymentClient = ServiceClientFactory.create('payment-service', {
          baseURL: process.env['PAYMENT_SERVICE_URL'] || 'http://localhost:3007',
          circuitBreaker: true,
        });

        const payment = (await paymentClient.post('/payments', {
          userId: data.userId,
          amount: data.amount,
          currency: data.currency,
          description: `Course enrollment: ${data.courseId}`,
          metadata: {
            courseId: data.courseId,
            sagaId: this.sagaId,
          },
        })) as any;

        if (payment.status !== 'completed') {
          throw new Error(`Payment failed: ${payment.failureReason || 'Unknown reason'}`);
        }

        logger.info(`Payment processed successfully: ${payment.id}`, {
          userId: data.userId,
          amount: data.amount,
          transactionId: payment.transactionId,
        });

        return { paymentId: payment.id };
      },
      compensate: async (data: CourseEnrollmentData) => {
        if (data.paymentId) {
          logger.info(`Refunding payment: ${data.paymentId}`);

          try {
            const paymentClient = ServiceClientFactory.create('payment-service', {
              baseURL: process.env['PAYMENT_SERVICE_URL'] || 'http://localhost:3007',
              circuitBreaker: true,
            });

            const refund = (await paymentClient.post(`/payments/${data.paymentId}/refund`, {
              reason: 'Enrollment saga compensation',
              amount: data.amount,
            })) as any;

            logger.info(`Payment refunded: ${data.paymentId}`, {
              refundId: refund.id,
              amount: data.amount,
            });
          } catch (error) {
            logger.error(`Failed to refund payment ${data.paymentId}:`, error);
            // Critical error - may need manual intervention
          }
        }
      },
      timeout: 30000,
      retryable: true,
      maxRetries: 2,
    },

    {
      name: 'create-enrollment',
      execute: async (data: CourseEnrollmentData) => {
        logger.info(`Creating enrollment for user ${data.userId} in course ${data.courseId}`);

        const enrollmentClient = ServiceClientFactory.getEnrollmentServiceClient();

        const enrollment = (await enrollmentClient.post('/enrollments', {
          userId: data.userId,
          courseId: data.courseId,
          status: 'active',
          enrolledBy: data.enrolledBy,
          paymentId: data.paymentId,
          reservationId: data.reservationId,
          enrolledAt: new Date(),
          metadata: {
            sagaId: this.sagaId,
            paymentAmount: data.amount,
            paymentCurrency: data.currency,
          },
        })) as any;

        logger.info(`Enrollment created: ${enrollment.id}`, {
          userId: data.userId,
          courseId: data.courseId,
        });

        return { enrollmentId: enrollment.id };
      },
      compensate: async (data: CourseEnrollmentData) => {
        if (data.enrollmentId) {
          logger.info(`Deleting enrollment: ${data.enrollmentId}`);

          try {
            const enrollmentClient = ServiceClientFactory.getEnrollmentServiceClient();
            await enrollmentClient.delete(`/enrollments/${data.enrollmentId}`);

            logger.info(`Enrollment deleted: ${data.enrollmentId}`);
          } catch (error) {
            logger.error(`Failed to delete enrollment ${data.enrollmentId}:`, error);
          }
        }
      },
      timeout: 10000,
      retryable: true,
      maxRetries: 3,
    },

    {
      name: 'confirm-seat-reservation',
      execute: async (data: CourseEnrollmentData) => {
        logger.info(`Confirming seat reservation: ${data.reservationId}`);

        const courseClient = ServiceClientFactory.getCourseServiceClient();

        // Confirm the reservation (convert temporary reservation to confirmed enrollment)
        await courseClient.put(
          `/courses/${data.courseId}/reservations/${data.reservationId}/confirm`,
          {
            enrollmentId: data.enrollmentId,
            confirmedAt: new Date(),
          },
        );

        logger.info(`Seat reservation confirmed: ${data.reservationId}`);
        return {};
      },
      compensate: async (_data: CourseEnrollmentData) => {
        // This step confirms a reservation, compensation is handled by the reservation system
        logger.debug('Seat confirmation compensation handled by reservation system');
      },
      timeout: 5000,
      retryable: true,
      maxRetries: 2,
    },

    {
      name: 'send-confirmation-notification',
      execute: async (data: CourseEnrollmentData) => {
        logger.info(`Sending enrollment confirmation to user ${data.userId}`);

        const notificationClient = ServiceClientFactory.create('notification-service', {
          baseURL: process.env['NOTIFICATION_SERVICE_URL'] || 'http://localhost:3008',
          circuitBreaker: true,
        });

        // Get user and course details for the notification
        const [user, course] = (await Promise.all([
          ServiceClientFactory.getUserServiceClient().get(`/users/${data.userId}`),
          ServiceClientFactory.getCourseServiceClient().get(`/courses/${data.courseId}`),
        ])) as any[];

        await notificationClient.post('/notifications', {
          userId: data.userId,
          type: 'enrollment_confirmation',
          channel: 'email',
          data: {
            userName: `${user.profile.firstName} ${user.profile.lastName}`,
            courseTitle: course.title,
            enrollmentId: data.enrollmentId,
            amount: data.amount,
            currency: data.currency,
            accessUrl: `${process.env['FRONTEND_URL']}/courses/${data.courseId}`,
          },
          metadata: {
            sagaId: this.sagaId,
          },
        });

        logger.info(`Enrollment confirmation sent to user ${data.userId}`);
        return {};
      },
      compensate: async (data: CourseEnrollmentData) => {
        logger.info(`Sending enrollment cancellation notification to user ${data.userId}`);

        try {
          const notificationClient = ServiceClientFactory.create('notification-service', {
            baseURL: process.env['NOTIFICATION_SERVICE_URL'] || 'http://localhost:3008',
            circuitBreaker: true,
          });

          // Get user details for the cancellation notification
          const user = (await ServiceClientFactory.getUserServiceClient().get(
            `/users/${data.userId}`,
          )) as any;
          const course = (await ServiceClientFactory.getCourseServiceClient().get(
            `/courses/${data.courseId}`,
          )) as any;

          await notificationClient.post('/notifications', {
            userId: data.userId,
            type: 'enrollment_cancelled',
            channel: 'email',
            data: {
              userName: `${user.profile.firstName} ${user.profile.lastName}`,
              courseTitle: course.title,
              reason: 'Technical issue during enrollment',
              refundAmount: data.amount,
              refundCurrency: data.currency,
            },
            metadata: {
              sagaId: this.sagaId,
              compensation: true,
            },
          });

          logger.info(`Enrollment cancellation notification sent to user ${data.userId}`);
        } catch (error) {
          logger.error(`Failed to send cancellation notification to user ${data.userId}:`, error);
          // Don't throw - notification failures shouldn't break compensation
        }
      },
      timeout: 15000,
      retryable: true,
      maxRetries: 2,
    },
  ];

  /**
   * Create a new course enrollment saga instance.
   */
  constructor(eventBus: EventBus, sagaId: string) {
    super(eventBus, sagaId, {
      globalTimeout: 120000, // 2 minutes total timeout
      publishEvents: true,
      metadata: {
        sagaType: 'course-enrollment',
        version: '1.0',
      },
    });
  }

  /**
   * Execute enrollment with additional validation.
   */
  override async execute(data: CourseEnrollmentData): Promise<any> {
    // Validate input data
    this.validateEnrollmentData(data);

    // Add audit trail
    await this.eventBus.publish({
      type: 'enrollment.saga.started',
      data: {
        sagaId: this.sagaId,
        userId: data.userId,
        courseId: data.courseId,
        amount: data.amount,
        currency: data.currency,
        enrolledBy: data.enrolledBy,
      },
    });

    const result = await super.execute(data);

    // Publish completion event
    if (result.success) {
      await this.eventBus.publish({
        type: 'enrollment.completed',
        data: {
          sagaId: this.sagaId,
          enrollmentId: result.data.enrollmentId,
          userId: data.userId,
          courseId: data.courseId,
          paymentId: result.data.paymentId,
          amount: data.amount,
          currency: data.currency,
        },
      });
    } else {
      await this.eventBus.publish({
        type: 'enrollment.failed',
        data: {
          sagaId: this.sagaId,
          userId: data.userId,
          courseId: data.courseId,
          error: result.error?.message,
          compensatedSteps: result.compensatedSteps,
        },
      });
    }

    return result;
  }

  /**
   * Validate enrollment data before execution.
   */
  private validateEnrollmentData(data: CourseEnrollmentData): void {
    if (!data.userId) {
      throw new Error('User ID is required for enrollment');
    }

    if (!data.courseId) {
      throw new Error('Course ID is required for enrollment');
    }

    if (!data.amount || data.amount <= 0) {
      throw new Error('Valid payment amount is required for enrollment');
    }

    if (!data.currency) {
      throw new Error('Currency is required for enrollment');
    }

    if (!data.enrolledBy) {
      throw new Error('Enrolled by field is required for audit trail');
    }

    // Additional business validations
    if (data.userId === data.enrolledBy) {
      // Self-enrollment
      logger.debug(`User ${data.userId} is enrolling themselves`);
    } else {
      // Admin/staff enrollment
      logger.debug(`User ${data.enrolledBy} is enrolling user ${data.userId}`);
    }
  }
}

/**
 * Factory function for creating course enrollment sagas.
 */
export function createCourseEnrollmentSaga(
  eventBus: EventBus,
  enrollmentData: CourseEnrollmentData,
): CourseEnrollmentSaga {
  const sagaId = `course-enrollment-${enrollmentData.userId}-${enrollmentData.courseId}-${Date.now()}`;
  return new CourseEnrollmentSaga(eventBus, sagaId);
}

/**
 * Utility functions for common enrollment scenarios.
 */
export class EnrollmentSagaUtils {
  /**
   * Bulk enrollment saga for multiple users in the same course.
   */
  static async enrollMultipleUsers(
    eventBus: EventBus,
    courseId: string,
    enrollments: Array<{
      userId: string;
      amount: number;
      currency: string;
      enrolledBy: string;
    }>,
  ): Promise<Array<any>> {
    logger.info(`Starting bulk enrollment for ${enrollments.length} users in course ${courseId}`);

    const sagas = enrollments.map(enrollment => {
      const saga = createCourseEnrollmentSaga(eventBus, {
        ...enrollment,
        courseId,
      });
      return { saga, data: { ...enrollment, courseId } };
    });

    // Execute sagas in parallel with controlled concurrency
    const results = [];
    const batchSize = 5; // Process 5 enrollments at a time

    for (let i = 0; i < sagas.length; i += batchSize) {
      const batch = sagas.slice(i, i + batchSize);
      const batchPromises = batch.map(({ saga, data }) => saga.execute(data));

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);

      // Brief pause between batches to avoid overwhelming services
      if (i + batchSize < sagas.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info(`Bulk enrollment completed: ${successful} successful, ${failed} failed`);

    return results;
  }

  /**
   * Waitlist enrollment saga for when courses are full.
   */
  static async enrollInWaitlist(
    eventBus: EventBus,
    enrollmentData: Omit<CourseEnrollmentData, 'amount'> & { waitlistPriority?: number },
  ): Promise<any> {
    // Simplified waitlist saga - no payment processing
    const saga = new (class extends Saga<typeof enrollmentData> {
      protected steps = [
        {
          name: 'check-waitlist-capacity',
          execute: async (data: typeof enrollmentData) => {
            const courseClient = ServiceClientFactory.getCourseServiceClient();
            const waitlistStatus = (await courseClient.get(
              `/courses/${data.courseId}/waitlist`,
            )) as any;

            if (waitlistStatus.full) {
              throw new Error('Waitlist is full');
            }

            return {};
          },
          compensate: async () => {},
        },
        {
          name: 'add-to-waitlist',
          execute: async (data: typeof enrollmentData) => {
            const enrollmentClient = ServiceClientFactory.getEnrollmentServiceClient();
            const waitlistEntry = (await enrollmentClient.post('/waitlist', {
              userId: data.userId,
              courseId: data.courseId,
              priority: data.waitlistPriority || 1,
              addedBy: data.enrolledBy,
              addedAt: new Date(),
            })) as any;

            return { waitlistId: waitlistEntry.id };
          },
          compensate: async (data: any) => {
            if (data.waitlistId) {
              const enrollmentClient = ServiceClientFactory.getEnrollmentServiceClient();
              await enrollmentClient.delete(`/waitlist/${data.waitlistId}`);
            }
          },
        },
      ];
    })(eventBus, `waitlist-${enrollmentData.userId}-${enrollmentData.courseId}-${Date.now()}`);

    return saga.execute(enrollmentData);
  }
}
