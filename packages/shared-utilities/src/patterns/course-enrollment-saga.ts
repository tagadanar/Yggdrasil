/**
 * Course Enrollment Saga
 * Orchestrates the complex flow of enrolling a student in a course
 * This is a placeholder implementation for the event-driven architecture tests
 */

import { Saga, SagaStep } from './saga';
import { EventBus } from '../events/event-bus';

export interface CourseEnrollmentData {
  studentId: string;
  courseId: string;
  paymentId?: string;
  reservationId?: string;
}

export class CourseEnrollmentSaga extends Saga<CourseEnrollmentData> {
  constructor(eventBus: EventBus) {
    super('CourseEnrollmentSaga', eventBus);
    this.defineSteps();
  }

  private defineSteps(): void {
    // Step 1: Check prerequisites
    this.addStep({
      name: 'checkPrerequisites',
      execute: async (data: CourseEnrollmentData) => {
        // Check if student meets course prerequisites
        return {
          ...data,
          prerequisitesMet: true,
        };
      },
      compensate: async (data: CourseEnrollmentData) => {
        // No compensation needed for checking
      },
    });

    // Step 2: Reserve seat in course
    this.addStep({
      name: 'reserveSeat',
      execute: async (data: CourseEnrollmentData) => {
        // Reserve a seat in the course
        return {
          ...data,
          reservationId: `reservation_${Date.now()}`,
        };
      },
      compensate: async (data: CourseEnrollmentData) => {
        // Cancel the reservation if later steps fail
        if (data.reservationId) {
          // Cancel reservation logic
        }
      },
    });

    // Step 3: Process payment
    this.addStep({
      name: 'processPayment',
      execute: async (data: CourseEnrollmentData) => {
        // Process payment for the course
        return {
          ...data,
          paymentId: `payment_${Date.now()}`,
        };
      },
      compensate: async (data: CourseEnrollmentData) => {
        // Refund payment if enrollment fails
        if (data.paymentId) {
          // Refund logic
        }
      },
    });

    // Step 4: Confirm enrollment
    this.addStep({
      name: 'confirmEnrollment',
      execute: async (data: CourseEnrollmentData) => {
        // Finalize the enrollment
        await this.eventBus.publish({
          type: 'student.enrolled',
          aggregateId: data.studentId,
          data: {
            studentId: data.studentId,
            courseId: data.courseId,
            enrollmentDate: new Date(),
          },
          metadata: {
            userId: 'system',
            timestamp: new Date(),
            version: 1,
          },
        });
        return data;
      },
      compensate: async (data: CourseEnrollmentData) => {
        // Remove enrollment record
        await this.eventBus.publish({
          type: 'student.unenrolled',
          aggregateId: data.studentId,
          data: {
            studentId: data.studentId,
            courseId: data.courseId,
            reason: 'Enrollment saga failed',
          },
          metadata: {
            userId: 'system',
            timestamp: new Date(),
            version: 1,
          },
        });
      },
    });
  }
}
