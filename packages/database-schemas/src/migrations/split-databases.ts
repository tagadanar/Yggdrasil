// packages/database-schemas/src/migrations/split-databases.ts
import { Migration } from './migration-runner';
import mongoose from 'mongoose';
import { dbManager } from '../connection/multi-db';
import { logger } from '@yggdrasil/shared-utilities';

export default class SplitDatabases extends Migration {
  name = 'split-databases';
  description = 'Split monolithic database into service-specific databases';

  async up() {
    logger.info('🚀 Starting database split migration...');

    // Phase 1: Create service databases and collections
    await this.createServiceDatabases();

    // Phase 2: Copy data to service databases
    await this.migrateData();

    // Phase 3: Set up data synchronization
    await this.setupSynchronization();

    // Phase 4: Verify data integrity
    await this.verifyMigration();

    logger.info('✅ Database split migration completed successfully');
  }

  private async createServiceDatabases() {
    logger.info('📁 Creating service databases...');

    const services = [
      'auth-service',
      'user-service',
      'course-service',
      'enrollment-service',
      'news-service',
      'planning-service',
      'statistics-service',
    ];

    for (const service of services) {
      const connection = await dbManager.connect(service);
      logger.info(`✅ Created database for ${service}: ${connection.db?.databaseName || 'unknown'}`);
    }
  }

  private async migrateData() {
    logger.info('📊 Starting data migration...');

    const sourceDb = mongoose.connection.db;

    // Migrate users data
    await this.migrateUsers(sourceDb);

    // Migrate courses data
    await this.migrateCourses(sourceDb);

    // Migrate enrollments
    await this.migrateEnrollments(sourceDb);

    // Migrate news
    await this.migrateNews(sourceDb);

    // Migrate events
    await this.migrateEvents(sourceDb);
  }

  private async migrateUsers(sourceDb: any) {
    logger.info('👥 Migrating users data...');

    const users = await sourceDb.collection('users').find({}).toArray();

    // Split user data between auth and user services
    const authConnection = dbManager.getConnection('auth-service');
    const userConnection = dbManager.getConnection('user-service');

    if (!authConnection || !userConnection) {
      throw new Error('Database connections not established');
    }

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
        authId: user._id.toString(), // Reference to auth service
        email: user.email, // Denormalized for queries
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
          accessibility: {
            colorblindMode: false,
            fontSize: 'medium',
            highContrast: false,
          },
        },
        metadata: {
          createdBy: user.createdBy,
          updatedBy: user.updatedBy,
          source: 'migration',
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      userProfiles.push(profileData);
    }

    // Batch insert for performance
    if (authUsers.length > 0) {
      await authConnection!.db!.collection('authusers').insertMany(authUsers, { ordered: false });
      logger.info(`✅ Migrated ${authUsers.length} auth users`);
    }

    if (userProfiles.length > 0) {
      await userConnection!.db!.collection('userprofiles').insertMany(userProfiles, { ordered: false });
      logger.info(`✅ Migrated ${userProfiles.length} user profiles`);
    }
  }

  private async migrateCourses(sourceDb: any) {
    logger.info('📚 Migrating courses data...');

    const courses = await sourceDb.collection('courses').find({}).toArray();
    const courseConnection = dbManager.getConnection('course-service');

    if (!courseConnection) {
      throw new Error('Course service database connection not established');
    }

    // Migrate courses with embedded data
    if (courses.length > 0) {
      await courseConnection!.db!.collection('courses').insertMany(courses, { ordered: false });
      logger.info(`✅ Migrated ${courses.length} courses`);
    }
  }

  private async migrateEnrollments(sourceDb: any) {
    logger.info('📋 Migrating enrollments data...');

    const enrollments = await sourceDb.collection('enrollments').find({}).toArray();
    const enrollmentConnection = dbManager.getConnection('enrollment-service');

    if (!enrollmentConnection) {
      throw new Error('Enrollment service database connection not established');
    }

    // Transform enrollments to new format
    const enrollmentData = [];

    for (const enrollment of enrollments) {
      // Main enrollment record
      const enrollmentRecord = {
        _id: enrollment._id,
        userId: enrollment.userId.toString(),
        courseId: enrollment.courseId.toString(),
        status: enrollment.status || 'active',
        enrolledAt: enrollment.enrolledAt || enrollment.createdAt,
        completedAt: enrollment.completedAt,
        progress: {
          percentage: enrollment.progress || 0,
          chaptersCompleted: enrollment.chaptersCompleted || [],
          sectionsCompleted: enrollment.sectionsCompleted || [],
          exercisesCompleted: enrollment.exercisesCompleted || [],
          timeSpent: enrollment.timeSpent || 0,
        },
        grades: {
          averageScore: enrollment.averageScore || 0,
          totalPoints: enrollment.totalPoints || 0,
          maxPoints: enrollment.maxPoints || 0,
          letterGrade: enrollment.letterGrade,
        },
        metadata: {
          enrollmentMethod: 'migration',
          source: 'migration',
        },
        createdAt: enrollment.createdAt,
        updatedAt: enrollment.updatedAt,
      };

      enrollmentData.push(enrollmentRecord);
    }

    // Insert enrollment data
    if (enrollmentData.length > 0) {
      await enrollmentConnection!.db!.collection('enrollments').insertMany(enrollmentData, { ordered: false });
      logger.info(`✅ Migrated ${enrollmentData.length} enrollments`);
    }

    // Also migrate progress and submissions if they exist
    const progress = await sourceDb.collection('progress').find({}).toArray();
    if (progress.length > 0) {
      await enrollmentConnection!.db!.collection('progress').insertMany(progress, { ordered: false });
      logger.info(`✅ Migrated ${progress.length} progress records`);
    }

    const submissions = await sourceDb.collection('submissions').find({}).toArray();
    if (submissions.length > 0) {
      await enrollmentConnection!.db!.collection('submissions').insertMany(submissions, { ordered: false });
      logger.info(`✅ Migrated ${submissions.length} submissions`);
    }
  }

  private async migrateNews(sourceDb: any) {
    logger.info('📰 Migrating news data...');

    const news = await sourceDb.collection('news').find({}).toArray();
    const newsConnection = dbManager.getConnection('news-service');

    if (!newsConnection) {
      throw new Error('News service database connection not established');
    }

    if (news.length > 0) {
      await newsConnection!.db!.collection('articles').insertMany(news, { ordered: false });
      logger.info(`✅ Migrated ${news.length} news articles`);
    }
  }

  private async migrateEvents(sourceDb: any) {
    logger.info('📅 Migrating events data...');

    const events = await sourceDb.collection('events').find({}).toArray();
    const planningConnection = dbManager.getConnection('planning-service');

    if (!planningConnection) {
      throw new Error('Planning service database connection not established');
    }

    if (events.length > 0) {
      await planningConnection!.db!.collection('events').insertMany(events, { ordered: false });
      logger.info(`✅ Migrated ${events.length} events`);
    }
  }

  private async setupSynchronization() {
    logger.info('🔄 Setting up data synchronization...');

    // This would be implemented with event-driven sync in Phase 4.2
    // For now, we'll just log that this step is reserved for later
    logger.info('📝 Data synchronization setup reserved for Phase 4.2 (Event-Driven Architecture)');
  }

  private async verifyMigration() {
    logger.info('✅ Verifying migration integrity...');

    // Verify record counts match
    const sourceDb = mongoose.connection.db!;
    const services = [
      { name: 'auth-service', collection: 'authusers', source: 'users' },
      { name: 'user-service', collection: 'userprofiles', source: 'users' },
      { name: 'course-service', collection: 'courses', source: 'courses' },
      { name: 'enrollment-service', collection: 'enrollments', source: 'enrollments' },
    ];

    let allVerified = true;

    for (const service of services) {
      try {
        const sourceCount = await sourceDb.collection(service.source).countDocuments();
        const targetConnection = dbManager.getConnection(service.name);

        if (!targetConnection) {
          logger.error(`❌ No connection for ${service.name}`);
          allVerified = false;
          continue;
        }

        const targetCount = await targetConnection.db!
          .collection(service.collection)
          .countDocuments();

        if (sourceCount === targetCount) {
          logger.info(`✅ ${service.name}: ${sourceCount} → ${targetCount} records`);
        } else {
          logger.error(`❌ ${service.name}: ${sourceCount} → ${targetCount} records (MISMATCH)`);
          allVerified = false;
        }
      } catch (error) {
        logger.error(`💥 Error verifying ${service.name}:`, error);
        allVerified = false;
      }
    }

    if (!allVerified) {
      throw new Error('Migration verification failed - data integrity compromised');
    }

    logger.info('✅ Migration verification passed - all data integrity checks successful');
  }

  async down() {
    // This is a one-way migration for safety
    throw new Error('Database split cannot be reversed automatically - this would require manual data consolidation');
  }
}
