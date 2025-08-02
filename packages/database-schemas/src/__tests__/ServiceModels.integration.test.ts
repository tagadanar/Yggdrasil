// packages/database-schemas/src/__tests__/ServiceModels.integration.test.ts
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { dbManager } from '../connection/multi-db';
import { createAuthUserModel } from '../models/AuthUser';
import { createUserProfileModel } from '../models/UserProfile';
import { createEnrollmentModels } from '../models/EnrollmentData';
import { config } from '@yggdrasil/shared-utilities';
import bcrypt from 'bcrypt';

describe('Service Models Integration - Phase 4.1 Validation', () => {
  let authUserModel: any;
  let userProfileModel: any;
  let enrollmentModels: any;

  beforeAll(async () => {
    // Ensure we have a test MongoDB URI
    if (!config.MONGODB_URI) {
      throw new Error('MONGODB_URI is required for integration tests');
    }

    // Initialize service-specific models
    authUserModel = await createAuthUserModel();
    userProfileModel = await createUserProfileModel();
    enrollmentModels = await createEnrollmentModels();
  });

  afterAll(async () => {
    // Clean up all test databases
    await dbManager.disconnectAll();
  });

  beforeEach(async () => {
    // Clear test data before each test
    await authUserModel.deleteMany({ email: /test.*@example\.com/ });
    await userProfileModel.deleteMany({ email: /test.*@example\.com/ });
    await enrollmentModels.EnrollmentData.deleteMany({ userId: /^test/ });
  });

  describe('Auth Service Database Operations', () => {
    test('should create and authenticate users in auth database', async () => {
      const userData = {
        email: 'testauth@example.com',
        password: 'SecurePass123!',
        role: 'student' as const,
        isActive: true,
      };

      // Create user
      const authUser = new authUserModel(userData);
      await authUser.save();

      expect(authUser._id).toBeDefined();
      expect(authUser.email).toBe(userData.email);
      expect(authUser.password).not.toBe(userData.password); // Should be hashed
      expect(authUser.role).toBe(userData.role);
      expect(authUser.tokenVersion).toBe(0);
      expect(authUser.securitySettings.passwordChangedAt).toBeDefined();

      // Test password comparison
      const isValid = await authUser.comparePassword('SecurePass123!');
      expect(isValid).toBe(true);

      const isInvalid = await authUser.comparePassword('WrongPassword');
      expect(isInvalid).toBe(false);
    });

    test('should find users by email', async () => {
      const userData = {
        email: 'testfind@example.com',
        password: 'TestPass123!',
        role: 'teacher' as const,
      };

      await authUserModel.create(userData);

      const foundUser = await authUserModel.findByEmail('testfind@example.com');
      expect(foundUser).toBeTruthy();
      expect(foundUser.email).toBe(userData.email);
      expect(foundUser.role).toBe(userData.role);

      const notFound = await authUserModel.findByEmail('nonexistent@example.com');
      expect(notFound).toBeNull();
    });

    test('should track login history', async () => {
      const authUser = await authUserModel.create({
        email: 'testlogin@example.com',
        password: 'TestPass123!',
        role: 'student',
      });

      // Add login history
      authUser.loginHistory.push({
        timestamp: new Date(),
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
        success: true,
      });

      await authUser.save();

      const updatedUser = await authUserModel.findById(authUser._id);
      expect(updatedUser.loginHistory).toHaveLength(1);
      expect(updatedUser.loginHistory[0].ip).toBe('192.168.1.100');
      expect(updatedUser.loginHistory[0].success).toBe(true);
    });

    test('should increment token version', async () => {
      const authUser = await authUserModel.create({
        email: 'testtoken@example.com',
        password: 'TestPass123!',
        role: 'student',
      });

      expect(authUser.tokenVersion).toBe(0);

      await authUser.incrementTokenVersion();
      expect(authUser.tokenVersion).toBe(1);

      await authUser.incrementTokenVersion();
      expect(authUser.tokenVersion).toBe(2);
    });

    test('should handle security settings', async () => {
      const authUser = await authUserModel.create({
        email: 'testsecurity@example.com',
        password: 'TestPass123!',
        role: 'admin',
        securitySettings: {
          twoFactorEnabled: true,
          twoFactorSecret: 'secret123',
        },
      });

      expect(authUser.securitySettings.twoFactorEnabled).toBe(true);
      expect(authUser.securitySettings.twoFactorSecret).toBe('secret123');
      expect(authUser.securitySettings.passwordChangedAt).toBeDefined();
    });
  });

  describe('User Service Database Operations', () => {
    test('should create and manage user profiles', async () => {
      const profileData = {
        authId: 'auth123',
        email: 'testprofile@example.com',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          department: 'Computer Science',
          bio: 'A passionate learner',
        },
        preferences: {
          language: 'en' as const,
          notifications: {
            scheduleChanges: true,
            newAnnouncements: false,
            assignmentReminders: true,
          },
        },
        metadata: {
          source: 'test',
          createdBy: 'system',
        },
      };

      const userProfile = await userProfileModel.create(profileData);

      expect(userProfile._id).toBeDefined();
      expect(userProfile.authId).toBe(profileData.authId);
      expect(userProfile.profile.firstName).toBe('John');
      expect(userProfile.profile.lastName).toBe('Doe');
      expect(userProfile.preferences.language).toBe('en');
      expect(userProfile.metadata.source).toBe('test');
    });

    test('should find profiles by auth ID', async () => {
      const authId = 'auth456';
      await userProfileModel.create({
        authId,
        email: 'testfindauth@example.com',
        profile: { firstName: 'Jane', lastName: 'Smith' },
        metadata: { source: 'test' },
      });

      const foundProfile = await userProfileModel.findByAuthId(authId);
      expect(foundProfile).toBeTruthy();
      expect(foundProfile.authId).toBe(authId);
      expect(foundProfile.profile.firstName).toBe('Jane');

      const notFound = await userProfileModel.findByAuthId('nonexistent');
      expect(notFound).toBeNull();
    });

    test('should handle contact information', async () => {
      const userProfile = await userProfileModel.create({
        authId: 'auth789',
        email: 'testcontact@example.com',
        profile: {
          firstName: 'Alice',
          lastName: 'Johnson',
          contactInfo: {
            phone: '+1234567890',
            address: '123 Main St, City, State',
            emergencyContact: {
              name: 'Bob Johnson',
              phone: '+0987654321',
              relation: 'Spouse',
            },
          },
        },
        metadata: { source: 'test' },
      });

      expect(userProfile.profile.contactInfo.phone).toBe('+1234567890');
      expect(userProfile.profile.contactInfo.emergencyContact.name).toBe('Bob Johnson');
      expect(userProfile.profile.contactInfo.emergencyContact.relation).toBe('Spouse');
    });

    test('should enforce unique student IDs', async () => {
      const studentId = 'STU12345';

      // First student with this ID should succeed
      await userProfileModel.create({
        authId: 'auth001',
        email: 'student1@example.com',
        profile: {
          firstName: 'Student',
          lastName: 'One',
          studentId,
        },
        metadata: { source: 'test' },
      });

      // Second student with same ID should fail
      await expect(
        userProfileModel.create({
          authId: 'auth002',
          email: 'student2@example.com',
          profile: {
            firstName: 'Student',
            lastName: 'Two',
            studentId,
          },
          metadata: { source: 'test' },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Enrollment Service Database Operations', () => {
    test('should create and manage enrollments', async () => {
      const enrollmentData = {
        userId: 'testuser123',
        courseId: 'testcourse456',
        status: 'active' as const,
        progress: {
          percentage: 25,
          chaptersCompleted: ['chapter1'],
          sectionsCompleted: ['section1.1', 'section1.2'],
          exercisesCompleted: ['exercise1'],
          timeSpent: 120,
        },
        metadata: {
          enrollmentMethod: 'self' as const,
          source: 'test',
        },
      };

      const enrollment = await enrollmentModels.EnrollmentData.create(enrollmentData);

      expect(enrollment._id).toBeDefined();
      expect(enrollment.userId).toBe('testuser123');
      expect(enrollment.courseId).toBe('testcourse456');
      expect(enrollment.status).toBe('active');
      expect(enrollment.progress.percentage).toBe(25);
      expect(enrollment.progress.chaptersCompleted).toContain('chapter1');
      expect(enrollment.enrolledAt).toBeDefined();
    });

    test('should track progress details', async () => {
      const progressData = {
        enrollmentId: 'enrollment123',
        userId: 'testuser123',
        courseId: 'testcourse456',
        sectionId: 'section1.1',
        exerciseId: 'exercise1',
        status: 'completed' as const,
        score: 85,
        maxScore: 100,
        attempts: 2,
        timeSpent: 300,
        completedAt: new Date(),
        metadata: {
          sessionId: 'session123',
        },
      };

      const progress = await enrollmentModels.Progress.create(progressData);

      expect(progress._id).toBeDefined();
      expect(progress.status).toBe('completed');
      expect(progress.score).toBe(85);
      expect(progress.attempts).toBe(2);
      expect(progress.completedAt).toBeDefined();
    });

    test('should record exercise submissions', async () => {
      const submissionData = {
        enrollmentId: 'enrollment456',
        userId: 'testuser123',
        courseId: 'testcourse456',
        exerciseId: 'exercise2',
        attempt: 1,
        answer: {
          question1: 'Answer A',
          question2: ['Option 1', 'Option 3'],
          question3: 42,
        },
        score: 90,
        maxScore: 100,
        isCorrect: true,
        feedback: 'Excellent work!',
        timeSpent: 180,
        gradedBy: 'auto',
      };

      const submission = await enrollmentModels.Submission.create(submissionData);

      expect(submission._id).toBeDefined();
      expect(submission.answer.question1).toBe('Answer A');
      expect(submission.score).toBe(90);
      expect(submission.isCorrect).toBe(true);
      expect(submission.feedback).toBe('Excellent work!');
    });

    test('should find enrollments by user', async () => {
      const userId = 'testuser789';

      await enrollmentModels.EnrollmentData.create({
        userId,
        courseId: 'course1',
        metadata: { enrollmentMethod: 'self', source: 'test' },
      });

      await enrollmentModels.EnrollmentData.create({
        userId,
        courseId: 'course2',
        metadata: { enrollmentMethod: 'admin', source: 'test' },
      });

      const userEnrollments = await enrollmentModels.EnrollmentData.findByUser(userId);
      expect(userEnrollments).toHaveLength(2);
      expect(userEnrollments[0].userId).toBe(userId);
      expect(userEnrollments[1].userId).toBe(userId);
    });

    test('should enforce unique enrollment per user-course combination', async () => {
      const enrollmentData = {
        userId: 'uniqueuser123',
        courseId: 'uniquecourse456',
        metadata: { enrollmentMethod: 'self' as const, source: 'test' },
      };

      // First enrollment should succeed
      await enrollmentModels.EnrollmentData.create(enrollmentData);

      // Duplicate enrollment should fail
      await expect(
        enrollmentModels.EnrollmentData.create(enrollmentData),
      ).rejects.toThrow();
    });
  });

  describe('Cross-Service Data Relationships', () => {
    test('should maintain referential integrity across services', async () => {
      const authId = 'crossauth123';
      const userId = 'crossuser123';
      const courseId = 'crosscourse123';

      // Create auth user
      const authUser = await authUserModel.create({
        email: 'crosstest@example.com',
        password: 'TestPass123!',
        role: 'student',
      });

      // Create user profile linked to auth user
      const userProfile = await userProfileModel.create({
        authId: authUser._id.toString(),
        email: 'crosstest@example.com',
        profile: { firstName: 'Cross', lastName: 'Test' },
        metadata: { source: 'test' },
      });

      // Create enrollment linked to user
      const enrollment = await enrollmentModels.EnrollmentData.create({
        userId: userProfile._id.toString(),
        courseId,
        metadata: { enrollmentMethod: 'self', source: 'test' },
      });

      // Verify relationships
      expect(userProfile.authId).toBe(authUser._id.toString());
      expect(enrollment.userId).toBe(userProfile._id.toString());

      // Verify data consistency
      expect(authUser.email).toBe(userProfile.email);
    });

    test('should handle data updates across services', async () => {
      // Create linked data
      const authUser = await authUserModel.create({
        email: 'updatetest@example.com',
        password: 'TestPass123!',
        role: 'student',
      });

      const userProfile = await userProfileModel.create({
        authId: authUser._id.toString(),
        email: 'updatetest@example.com',
        profile: { firstName: 'Original', lastName: 'Name' },
        metadata: { source: 'test' },
      });

      // Update auth user email
      authUser.email = 'updated@example.com';
      await authUser.save();

      // Update user profile email (simulating sync)
      userProfile.email = 'updated@example.com';
      userProfile.profile.firstName = 'Updated';
      await userProfile.save();

      // Verify updates
      const updatedAuth = await authUserModel.findById(authUser._id);
      const updatedProfile = await userProfileModel.findById(userProfile._id);

      expect(updatedAuth.email).toBe('updated@example.com');
      expect(updatedProfile.email).toBe('updated@example.com');
      expect(updatedProfile.profile.firstName).toBe('Updated');
    });
  });

  describe('Database Isolation Verification', () => {
    test('should store data in separate databases', async () => {
      // Get connections for verification
      const authConnection = dbManager.getConnection('auth-service');
      const userConnection = dbManager.getConnection('user-service');
      const enrollmentConnection = dbManager.getConnection('enrollment-service');

      expect(authConnection).toBeDefined();
      expect(userConnection).toBeDefined();
      expect(enrollmentConnection).toBeDefined();

      // Verify different database names
      const authDbName = authConnection?.db?.databaseName;
      const userDbName = userConnection?.db?.databaseName;
      const enrollmentDbName = enrollmentConnection?.db?.databaseName;

      expect(authDbName).toMatch(/yggdrasil_auth_/);
      expect(userDbName).toMatch(/yggdrasil_user_/);
      expect(enrollmentDbName).toMatch(/yggdrasil_enrollment_/);

      expect(authDbName).not.toBe(userDbName);
      expect(userDbName).not.toBe(enrollmentDbName);
      expect(authDbName).not.toBe(enrollmentDbName);
    });

    test('should handle connection failures gracefully', async () => {
      // Test with invalid service name
      await expect(
        dbManager.connect('invalid-service', 'mongodb://invalid:27017/test'),
      ).rejects.toThrow();

      // Verify other connections still work
      const validConnection = await dbManager.connect('test-service');
      expect(validConnection.readyState).toBe(1);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent operations across services', async () => {
      const promises = [];

      // Create multiple users across services concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(
          authUserModel.create({
            email: `concurrent${i}@example.com`,
            password: 'TestPass123!',
            role: 'student',
          }),
        );

        promises.push(
          userProfileModel.create({
            authId: `auth${i}`,
            email: `concurrent${i}@example.com`,
            profile: { firstName: `User${i}`, lastName: 'Test' },
            metadata: { source: 'test' },
          }),
        );

        promises.push(
          enrollmentModels.EnrollmentData.create({
            userId: `user${i}`,
            courseId: `course${i}`,
            metadata: { enrollmentMethod: 'self', source: 'test' },
          }),
        );
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(30); // 10 users × 3 operations each

      // Verify all operations succeeded
      results.forEach(result => {
        expect(result._id).toBeDefined();
      });
    });

    test('should maintain performance with indexed queries', async () => {
      // Create test data
      const users = [];
      for (let i = 0; i < 50; i++) {
        users.push({
          email: `perftest${i}@example.com`,
          password: 'TestPass123!',
          role: 'student',
        });
      }

      await authUserModel.insertMany(users);

      // Test indexed email queries
      const startTime = Date.now();
      const foundUser = await authUserModel.findByEmail('perftest25@example.com');
      const queryTime = Date.now() - startTime;

      expect(foundUser).toBeTruthy();
      expect(queryTime).toBeLessThan(100); // Should be fast with index
    });
  });
});
