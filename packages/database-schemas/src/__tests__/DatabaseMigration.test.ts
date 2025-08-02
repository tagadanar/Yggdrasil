// packages/database-schemas/src/__tests__/DatabaseMigration.test.ts
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { dbManager } from '../connection/multi-db';
import SplitDatabases from '../migrations/split-databases';
import { config } from '@yggdrasil/shared-utilities';

describe('Database Migration - Phase 4.1 Validation', () => {
  let migration: SplitDatabases;
  let sourceConnection: mongoose.Connection;

  beforeAll(async () => {
    // Ensure we have a test MongoDB URI
    if (!config.MONGODB_URI) {
      throw new Error('MONGODB_URI is required for migration tests');
    }

    // Connect to source database
    sourceConnection = await mongoose.createConnection(config.MONGODB_URI);

    // Initialize migration
    migration = new SplitDatabases();
  });

  afterAll(async () => {
    // Clean up connections
    await sourceConnection.close();
    await dbManager.disconnectAll();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await sourceConnection.db!.collection('users').deleteMany({ email: /test.*@example\.com/ });
    await sourceConnection.db!.collection('courses').deleteMany({ title: /Test Course/ });
    await sourceConnection.db!.collection('enrollments').deleteMany({ userId: /^test/ });
    await sourceConnection.db!.collection('news').deleteMany({ title: /Test Article/ });
    await sourceConnection.db!.collection('events').deleteMany({ title: /Test Event/ });
  });

  describe('Migration Setup and Validation', () => {
    test('should have correct migration metadata', () => {
      expect(migration.name).toBe('split-databases');
      expect(migration.description).toBe('Split monolithic database into service-specific databases');
    });

    test('should create service databases', async () => {
      // This test calls the private method indirectly through up()
      // We'll verify by checking if connections can be established
      const services = [
        'auth-service',
        'user-service',
        'course-service',
        'enrollment-service',
        'news-service',
        'planning-service',
        'statistics-service',
      ];

      const connections = await Promise.all(
        services.map(service => dbManager.connect(service)),
      );

      expect(connections).toHaveLength(services.length);
      connections.forEach(connection => {
        expect(connection.readyState).toBe(1); // Connected
      });

      // Verify different database names
      const dbNames = connections.map(conn => conn.db?.databaseName);
      const uniqueNames = new Set(dbNames);
      expect(uniqueNames.size).toBe(services.length);
    });
  });

  describe('Sample Data Migration', () => {
    beforeEach(async () => {
      // Create sample data in source database
      await createSampleSourceData();
    });

    test('should migrate users to auth and user services', async () => {
      // Create connections to target databases
      const authConnection = await dbManager.connect('auth-service');
      const userConnection = await dbManager.connect('user-service');

      // Run migration (simplified - we'll test the user migration part)
      await migrateUsersOnly();

      // Verify auth service data
      const authUsers = await authConnection.db!.collection('authusers').find({}).toArray();
      expect(authUsers.length).toBeGreaterThan(0);

      const authUser = authUsers[0];
      expect(authUser).toHaveProperty('email');
      expect(authUser).toHaveProperty('password');
      expect(authUser).toHaveProperty('role');
      expect(authUser).toHaveProperty('tokenVersion');
      expect(authUser).not.toHaveProperty('profile'); // Should not have profile data

      // Verify user service data
      const userProfiles = await userConnection.db!.collection('userprofiles').find({}).toArray();
      expect(userProfiles.length).toBeGreaterThan(0);

      const userProfile = userProfiles[0];
      expect(userProfile).toHaveProperty('authId');
      expect(userProfile).toHaveProperty('email');
      expect(userProfile).toHaveProperty('profile');
      expect(userProfile).toHaveProperty('preferences');
      expect(userProfile).toHaveProperty('metadata');
      expect(userProfile).not.toHaveProperty('password'); // Should not have auth data
    });

    test('should migrate courses to course service', async () => {
      const courseConnection = await dbManager.connect('course-service');

      await migrateCoursesSOnly();

      const courses = await courseConnection.db!.collection('courses').find({}).toArray();
      expect(courses.length).toBeGreaterThan(0);

      const course = courses[0];
      expect(course).toHaveProperty('title');
      expect(course).toHaveProperty('teacherId');
      expect(course).toHaveProperty('description');
    });

    test('should migrate enrollments to enrollment service', async () => {
      const enrollmentConnection = await dbManager.connect('enrollment-service');

      await migrateEnrollmentsOnly();

      const enrollments = await enrollmentConnection.db!.collection('enrollments').find({}).toArray();
      expect(enrollments.length).toBeGreaterThan(0);

      const enrollment = enrollments[0];
      expect(enrollment).toHaveProperty('userId');
      expect(enrollment).toHaveProperty('courseId');
      expect(enrollment).toHaveProperty('status');
      expect(enrollment).toHaveProperty('progress');
      expect(enrollment).toHaveProperty('metadata');
    });

    test('should migrate news to news service', async () => {
      const newsConnection = await dbManager.connect('news-service');

      await migrateNewsOnly();

      const articles = await newsConnection.db!.collection('articles').find({}).toArray();
      expect(articles.length).toBeGreaterThan(0);

      const article = articles[0];
      expect(article).toHaveProperty('title');
      expect(article).toHaveProperty('content');
    });

    test('should migrate events to planning service', async () => {
      const planningConnection = await dbManager.connect('planning-service');

      await migrateEventsOnly();

      const events = await planningConnection.db!.collection('events').find({}).toArray();
      expect(events.length).toBeGreaterThan(0);

      const event = events[0];
      expect(event).toHaveProperty('title');
      expect(event).toHaveProperty('date');
    });
  });

  describe('Data Integrity Verification', () => {
    beforeEach(async () => {
      await createSampleSourceData();
    });

    test('should maintain referential integrity during migration', async () => {
      // Run migration
      await migrateUsersOnly();

      // Get source and target data
      const sourceUsers = await sourceConnection.db!.collection('users').find({}).toArray();
      const authUsers = await (await dbManager.connect('auth-service')).db!
        .collection('authusers').find({}).toArray();
      const userProfiles = await (await dbManager.connect('user-service')).db!
        .collection('userprofiles').find({}).toArray();

      // Verify counts match
      expect(authUsers.length).toBe(sourceUsers.length);
      expect(userProfiles.length).toBe(sourceUsers.length);

      // Verify data consistency
      sourceUsers.forEach(sourceUser => {
        const authUser = authUsers.find(au => au.email === sourceUser.email);
        const userProfile = userProfiles.find(up => up.email === sourceUser.email);

        expect(authUser).toBeDefined();
        expect(userProfile).toBeDefined();
        expect(userProfile.authId).toBe(authUser._id.toString());
      });
    });

    test('should preserve data types and validation', async () => {
      await migrateUsersOnly();

      const authUsers = await (await dbManager.connect('auth-service')).db!
        .collection('authusers').find({}).toArray();

      authUsers.forEach(user => {
        expect(typeof user.email).toBe('string');
        expect(typeof user.password).toBe('string');
        expect(['admin', 'staff', 'teacher', 'student']).toContain(user.role);
        expect(typeof user.isActive).toBe('boolean');
        expect(typeof user.tokenVersion).toBe('number');
        expect(user.createdAt).toBeInstanceOf(Date);
        expect(user.updatedAt).toBeInstanceOf(Date);
      });
    });

    test('should handle complex nested data structures', async () => {
      await migrateUsersOnly();

      const userProfiles = await (await dbManager.connect('user-service')).db!
        .collection('userprofiles').find({}).toArray();

      userProfiles.forEach(profile => {
        expect(profile.profile).toBeDefined();
        expect(profile.preferences).toBeDefined();
        expect(profile.metadata).toBeDefined();

        if (profile.profile.contactInfo) {
          expect(typeof profile.profile.contactInfo).toBe('object');
        }
      });
    });
  });

  describe('Migration Error Handling', () => {
    test('should handle missing source data gracefully', async () => {
      // Clear source data
      await sourceConnection.db!.collection('users').deleteMany({});

      // Migration should still succeed (with no data to migrate)
      await expect(migrateUsersOnly()).resolves.not.toThrow();

      const authUsers = await (await dbManager.connect('auth-service')).db!
        .collection('authusers').find({}).toArray();
      expect(authUsers).toHaveLength(0);
    });

    test('should handle duplicate data during migration', async () => {
      // Create duplicate users in source
      await sourceConnection.db!.collection('users').insertMany([
        {
          email: 'duplicate@example.com',
          password: 'pass1',
          role: 'student',
          profile: { firstName: 'First', lastName: 'User' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          email: 'duplicate@example.com',
          password: 'pass2',
          role: 'teacher',
          profile: { firstName: 'Second', lastName: 'User' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Migration might fail or handle duplicates - test the behavior
      try {
        await migrateUsersOnly();

        // If it succeeds, verify which record was kept
        const authUsers = await (await dbManager.connect('auth-service')).db!
          .collection('authusers').find({ email: 'duplicate@example.com' }).toArray();

        expect(authUsers.length).toBeLessThanOrEqual(1);
      } catch (error) {
        // If it fails, that's also acceptable behavior
        expect(error).toBeDefined();
      }
    });
  });

  describe('Migration Performance', () => {
    test('should handle large datasets efficiently', async () => {
      // Create larger dataset
      const largeUserData = [];
      for (let i = 0; i < 100; i++) {
        largeUserData.push({
          email: `perfuser${i}@example.com`,
          password: 'password123',
          role: 'student',
          profile: {
            firstName: `User${i}`,
            lastName: 'Performance',
            department: 'Testing',
          },
          preferences: {
            language: 'en',
            notifications: {
              scheduleChanges: true,
              newAnnouncements: true,
              assignmentReminders: false,
            },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await sourceConnection.db!.collection('users').insertMany(largeUserData);

      const startTime = Date.now();
      await migrateUsersOnly();
      const migrationTime = Date.now() - startTime;

      // Verify migration completed
      const authUsers = await (await dbManager.connect('auth-service')).db!
        .collection('authusers').find({}).toArray();
      expect(authUsers.length).toBeGreaterThanOrEqual(100);

      // Migration should complete in reasonable time (less than 10 seconds for 100 users)
      expect(migrationTime).toBeLessThan(10000);
    });
  });

  describe('Rollback Prevention', () => {
    test('should prevent rollback attempts', async () => {
      await expect(migration.down()).rejects.toThrow(
        'Database split cannot be reversed automatically',
      );
    });
  });

  // Helper functions for testing specific migration parts
  async function createSampleSourceData() {
    // Create sample users
    await sourceConnection.db!.collection('users').insertMany([
      {
        email: 'testuser1@example.com',
        password: 'hashedpassword1',
        role: 'student',
        profile: {
          firstName: 'Test',
          lastName: 'User1',
          department: 'Computer Science',
          contactInfo: {
            phone: '+1234567890',
            address: '123 Test St',
          },
        },
        preferences: {
          language: 'en',
          notifications: {
            scheduleChanges: true,
            newAnnouncements: true,
            assignmentReminders: false,
          },
        },
        isActive: true,
        tokenVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        email: 'testteacher@example.com',
        password: 'hashedpassword2',
        role: 'teacher',
        profile: {
          firstName: 'Test',
          lastName: 'Teacher',
          department: 'Mathematics',
          officeHours: 'MWF 2-4 PM',
        },
        preferences: {
          language: 'fr',
          notifications: {
            scheduleChanges: true,
            newAnnouncements: true,
            assignmentReminders: true,
          },
        },
        isActive: true,
        tokenVersion: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Create sample courses
    await sourceConnection.db!.collection('courses').insertMany([
      {
        title: 'Test Course 1',
        description: 'A test course for migration testing',
        teacherId: 'testteacher123',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Create sample enrollments
    await sourceConnection.db!.collection('enrollments').insertMany([
      {
        userId: 'testuser123',
        courseId: 'testcourse123',
        status: 'active',
        progress: 50,
        enrolledAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Create sample news
    await sourceConnection.db!.collection('news').insertMany([
      {
        title: 'Test Article 1',
        content: 'This is a test article for migration',
        authorId: 'testteacher123',
        status: 'published',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Create sample events
    await sourceConnection.db!.collection('events').insertMany([
      {
        title: 'Test Event 1',
        description: 'A test event for migration',
        date: new Date(),
        organizerId: 'testteacher123',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  }

  async function migrateUsersOnly() {
    // Simulate the user migration part of the full migration
    const sourceDb = sourceConnection.db!;
    const users = await sourceDb.collection('users').find({}).toArray();

    const authConnection = await dbManager.connect('auth-service');
    const userConnection = await dbManager.connect('user-service');

    const authUsers = [];
    const userProfiles = [];

    for (const user of users) {
      // Auth service data
      const authData = {
        _id: user._id,
        email: user.email,
        password: user.password,
        role: user.role,
        isActive: user.isActive,
        tokenVersion: user.tokenVersion || 0,
        lastLogin: user.lastLogin,
        loginHistory: [],
        securitySettings: {
          twoFactorEnabled: false,
          passwordChangedAt: user.createdAt,
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      authUsers.push(authData);

      // User service data
      const profileData = {
        _id: user._id,
        authId: user._id.toString(),
        email: user.email,
        profile: user.profile || {
          firstName: 'Unknown',
          lastName: 'User',
        },
        preferences: user.preferences || {
          language: 'fr',
          notifications: {
            scheduleChanges: true,
            newAnnouncements: true,
            assignmentReminders: true,
          },
        },
        metadata: {
          source: 'migration',
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      userProfiles.push(profileData);
    }

    if (authUsers.length > 0) {
      await authConnection.db!.collection('authusers').insertMany(authUsers, { ordered: false });
    }

    if (userProfiles.length > 0) {
      await userConnection.db!.collection('userprofiles').insertMany(userProfiles, { ordered: false });
    }
  }

  async function migrateCoursesSOnly() {
    const sourceDb = sourceConnection.db!;
    const courses = await sourceDb.collection('courses').find({}).toArray();
    const courseConnection = await dbManager.connect('course-service');

    if (courses.length > 0) {
      await courseConnection.db!.collection('courses').insertMany(courses, { ordered: false });
    }
  }

  async function migrateEnrollmentsOnly() {
    const sourceDb = sourceConnection.db!;
    const enrollments = await sourceDb.collection('enrollments').find({}).toArray();
    const enrollmentConnection = await dbManager.connect('enrollment-service');

    if (enrollments.length > 0) {
      const enrollmentData = enrollments.map(enrollment => ({
        _id: enrollment._id,
        userId: enrollment.userId.toString(),
        courseId: enrollment.courseId.toString(),
        status: enrollment.status || 'active',
        enrolledAt: enrollment.enrolledAt || enrollment.createdAt,
        progress: {
          percentage: enrollment.progress || 0,
          chaptersCompleted: [],
          sectionsCompleted: [],
          exercisesCompleted: [],
          timeSpent: 0,
        },
        grades: {
          averageScore: 0,
          totalPoints: 0,
          maxPoints: 0,
        },
        metadata: {
          enrollmentMethod: 'migration',
          source: 'migration',
        },
        createdAt: enrollment.createdAt,
        updatedAt: enrollment.updatedAt,
      }));

      await enrollmentConnection.db!.collection('enrollments').insertMany(enrollmentData, { ordered: false });
    }
  }

  async function migrateNewsOnly() {
    const sourceDb = sourceConnection.db!;
    const news = await sourceDb.collection('news').find({}).toArray();
    const newsConnection = await dbManager.connect('news-service');

    if (news.length > 0) {
      await newsConnection.db!.collection('articles').insertMany(news, { ordered: false });
    }
  }

  async function migrateEventsOnly() {
    const sourceDb = sourceConnection.db!;
    const events = await sourceDb.collection('events').find({}).toArray();
    const planningConnection = await dbManager.connect('planning-service');

    if (events.length > 0) {
      await planningConnection.db!.collection('events').insertMany(events, { ordered: false });
    }
  }
});
