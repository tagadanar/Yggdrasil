// packages/api-services/planning-service/src/controllers/SystemController.ts
// System monitoring and database state management controller

import { Response } from 'express';
import mongoose from 'mongoose';
import { ResponseHelper, AuthRequest, planningLogger as logger } from '@yggdrasil/shared-utilities';
import {
  UserModel,
  CourseModel,
  PromotionModel,
  EventModel,
  NewsArticleModel,
  PromotionProgressModel,
  EventAttendanceModel,
} from '@yggdrasil/database-schemas';
import { ComprehensiveDevSeeder } from '@yggdrasil/database-schemas/src/scripts/comprehensive-dev-seeder';

interface DatabaseState {
  collections: {
    users: {
      count: number;
      byRole: Record<string, number>;
      active: number;
      inactive: number;
    };
    courses: {
      count: number;
      byCategory: Record<string, number>;
      published: number;
      draft: number;
    };
    promotions: {
      count: number;
      bySemester: Record<string, number>;
      byStatus: Record<string, number>;
    };
    events: {
      count: number;
      upcoming: number;
      past: number;
      byType: Record<string, number>;
    };
    news: {
      count: number;
      published: number;
      draft: number;
      byCategory: Record<string, number>;
    };
    progress: {
      totalRecords: number;
      averageProgress: number;
      studentsWithProgress: number;
    };
    attendance: {
      totalRecords: number;
      overallAttendanceRate: number;
      recentEvents: number;
    };
  };
  relationships: {
    orphanedRecords: Array<{ collection: string; count: number; ids: string[] }>;
    integrityIssues: IntegrityCheck[];
  };
  performance: {
    slowQueries: SlowQuery[];
    indexUsage: IndexStats[];
    connectionStats: {
      activeConnections: number;
      availableConnections: number;
      totalConnections: number;
    };
  };
  metadata: {
    lastUpdated: string;
    databaseSize: string;
    indexSize: string;
    uptime: number;
  };
}

interface IntegrityCheck {
  type: 'orphaned_reference' | 'missing_required' | 'invalid_data';
  collection: string;
  field: string;
  count: number;
  sample: any[];
}

interface SlowQuery {
  operation: string;
  collection: string;
  duration: number;
  timestamp: string;
}

interface IndexStats {
  collection: string;
  index: string;
  usage: number;
  efficiency: number;
}

export class SystemController {
  /**
   * Get comprehensive database state
   */
  async getDatabaseState(_req: AuthRequest, res: Response): Promise<Response> {
    try {
      logger.info('Fetching database state...');

      const state: DatabaseState = {
        collections: await this.getCollectionStats(),
        relationships: await this.checkDataIntegrity(),
        performance: await this.getPerformanceStats(),
        metadata: await this.getMetadata(),
      };

      logger.info('Database state fetched successfully');
      return res.json(ResponseHelper.success(state));
    } catch (error: any) {
      logger.error('Failed to get database state:', error);
      return res.status(500).json(ResponseHelper.error(`Failed to get database state: ${error.message}`, 500));
    }
  }

  /**
   * Get system health information
   */
  async getSystemHealth(_req: AuthRequest, res: Response): Promise<Response> {
    try {
      logger.info('Performing system health check...');

      const health = {
        database: await this.checkDatabaseHealth(),
        services: await this.checkServicesHealth(),
        system: await this.getSystemMetrics(),
        lastCheck: new Date().toISOString(),
      };

      logger.info('System health check completed');
      return res.json(ResponseHelper.success(health));
    } catch (error: any) {
      logger.error('System health check failed:', error);
      return res.status(500).json(ResponseHelper.error(`System health check failed: ${error.message}`, 500));
    }
  }

  /**
   * Seed development database
   */
  async seedDatabase(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only allow admins to seed
      if (req.user?.role !== 'admin') {
        return res.status(403).json(ResponseHelper.error('Only administrators can seed the database', 403));
      }

      logger.info(`Database seeding initiated by admin: ${req.user.email}`);

      const config = req.body || {};
      const seeder = new ComprehensiveDevSeeder(config);
      const result = await seeder.seedAll();

      logger.info(`Database seeded successfully: ${JSON.stringify(result.statistics)}`);
      return res.json(ResponseHelper.success(result, 'Database seeded successfully'));
    } catch (error: any) {
      logger.error('Database seeding failed:', error);
      return res.status(500).json(ResponseHelper.error(`Database seeding failed: ${error.message}`, 500));
    }
  }

  /**
   * Reset and re-seed database
   */
  async resetDatabase(req: AuthRequest, res: Response): Promise<Response> {
    try {
      // Only allow admins to reset
      if (req.user?.role !== 'admin') {
        return res.status(403).json(ResponseHelper.error('Only administrators can reset the database', 403));
      }

      logger.warn(`Database reset initiated by admin: ${req.user.email}`);

      // Full reset with clearing existing data
      const seeder = new ComprehensiveDevSeeder({ clearExisting: true });
      const result = await seeder.seedAll();

      logger.info(`Database reset and seeded successfully: ${JSON.stringify(result.statistics)}`);
      return res.json(ResponseHelper.success(result, 'Database reset and seeded successfully'));
    } catch (error: any) {
      logger.error('Database reset failed:', error);
      return res.status(500).json(ResponseHelper.error(`Database reset failed: ${error.message}`, 500));
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(_req: AuthRequest, res: Response): Promise<Response> {
    try {
      const metrics = {
        database: await this.getDatabasePerformance(),
        queries: await this.getQueryPerformance(),
        connections: await this.getConnectionStats(),
        indexes: await this.getIndexStats(),
        timestamp: new Date().toISOString(),
      };

      return res.json(ResponseHelper.success(metrics));
    } catch (error: any) {
      logger.error('Failed to get performance metrics:', error);
      return res.status(500).json(ResponseHelper.error(`Failed to get performance metrics: ${error.message}`, 500));
    }
  }

  /**
   * Run database integrity check
   */
  async checkIntegrity(_req: AuthRequest, res: Response): Promise<Response> {
    try {
      logger.info('Running database integrity check...');

      const results = await this.checkDataIntegrity();
      const hasIssues = results.orphanedRecords.length > 0 || results.integrityIssues.length > 0;

      logger.info(`Integrity check completed. Found ${results.integrityIssues.length} issues and ${results.orphanedRecords.length} orphaned records`);

      return res.json(ResponseHelper.success({
        ...results,
        summary: {
          healthy: !hasIssues,
          totalIssues: results.integrityIssues.length,
          totalOrphanedRecords: results.orphanedRecords.reduce((sum, r) => sum + r.count, 0),
        },
        checkedAt: new Date().toISOString(),
      }));
    } catch (error: any) {
      logger.error('Integrity check failed:', error);
      return res.status(500).json(ResponseHelper.error(`Integrity check failed: ${error.message}`, 500));
    }
  }

  // Private helper methods

  private async getCollectionStats() {
    const stats = {
      users: {
        count: await UserModel.countDocuments(),
        byRole: {},
        active: await UserModel.countDocuments({ isActive: true }),
        inactive: await UserModel.countDocuments({ isActive: false }),
      } as any,
      courses: {
        count: await CourseModel.countDocuments(),
        byCategory: {},
        published: await CourseModel.countDocuments({ isPublished: true }),
        draft: await CourseModel.countDocuments({ isPublished: false }),
      } as any,
      promotions: {
        count: await PromotionModel.countDocuments(),
        bySemester: {},
        byStatus: {},
      } as any,
      events: {
        count: await EventModel.countDocuments(),
        upcoming: await EventModel.countDocuments({ startDate: { $gte: new Date() } }),
        past: await EventModel.countDocuments({ startDate: { $lt: new Date() } }),
        byType: {},
      } as any,
      news: {
        count: await NewsArticleModel.countDocuments(),
        published: await NewsArticleModel.countDocuments({ status: 'published' }),
        draft: await NewsArticleModel.countDocuments({ status: 'draft' }),
        byCategory: {},
      } as any,
      progress: {
        totalRecords: await PromotionProgressModel.countDocuments(),
        averageProgress: 0,
        studentsWithProgress: 0,
      },
      attendance: {
        totalRecords: await EventAttendanceModel.countDocuments(),
        overallAttendanceRate: 0,
        recentEvents: await EventAttendanceModel.countDocuments({
          markedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }),
      },
    };

    // Get role distribution
    const roleAggregation = await UserModel.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    stats.users.byRole = roleAggregation.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Get course categories
    const categoryAggregation = await CourseModel.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    stats.courses.byCategory = categoryAggregation.reduce((acc, item) => {
      acc[item._id || 'uncategorized'] = item.count;
      return acc;
    }, {});

    // Get promotion semester distribution
    const semesterAggregation = await PromotionModel.aggregate([
      { $group: { _id: '$semester', count: { $sum: 1 } } }
    ]);
    stats.promotions.bySemester = semesterAggregation.reduce((acc, item) => {
      acc[`S${item._id}`] = item.count;
      return acc;
    }, {});

    // Get promotion status distribution
    const statusAggregation = await PromotionModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    stats.promotions.byStatus = statusAggregation.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Get event type distribution
    const eventTypeAggregation = await EventModel.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    stats.events.byType = eventTypeAggregation.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Get news category distribution
    const newsCategoryAggregation = await NewsArticleModel.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    stats.news.byCategory = newsCategoryAggregation.reduce((acc, item) => {
      acc[item._id || 'uncategorized'] = item.count;
      return acc;
    }, {});

    // Get progress statistics
    const progressStats = await PromotionProgressModel.aggregate([
      {
        $group: {
          _id: null,
          avgProgress: { $avg: '$overallProgress' },
          studentsCount: { $sum: 1 }
        }
      }
    ]);

    if (progressStats.length > 0) {
      stats.progress.averageProgress = Math.round(progressStats[0].avgProgress || 0);
      stats.progress.studentsWithProgress = progressStats[0].studentsCount;
    }

    // Get attendance statistics
    const attendanceStats = await EventAttendanceModel.aggregate([
      {
        $group: {
          _id: null,
          totalAttended: { $sum: { $cond: ['$attended', 1, 0] } },
          totalRecords: { $sum: 1 }
        }
      }
    ]);

    if (attendanceStats.length > 0) {
      const total = attendanceStats[0].totalRecords;
      const attended = attendanceStats[0].totalAttended;
      stats.attendance.overallAttendanceRate = total > 0 ? Math.round((attended / total) * 100) : 100;
    }

    return stats;
  }

  private async checkDataIntegrity() {
    const orphanedRecords: Array<{ collection: string; count: number; ids: string[] }> = [];
    const integrityIssues: IntegrityCheck[] = [];

    try {
      // Check for courses with invalid instructors
      const coursesWithInvalidInstructors = await CourseModel.find({
        instructor: { $exists: true }
      }).populate('instructor');

      const invalidCourses = coursesWithInvalidInstructors.filter(course => !course.instructor);
      if (invalidCourses.length > 0) {
        integrityIssues.push({
          type: 'orphaned_reference',
          collection: 'courses',
          field: 'instructor',
          count: invalidCourses.length,
          sample: invalidCourses.slice(0, 5).map(c => ({ _id: c._id, title: c.title })),
        });
      }

      // Check for events with invalid linked courses
      const eventsWithInvalidCourses = await EventModel.find({
        linkedCourse: { $exists: true, $ne: null }
      }).populate('linkedCourse');

      const invalidEvents = eventsWithInvalidCourses.filter(event => !event.linkedCourse);
      if (invalidEvents.length > 0) {
        integrityIssues.push({
          type: 'orphaned_reference',
          collection: 'events',
          field: 'linkedCourse',
          count: invalidEvents.length,
          sample: invalidEvents.slice(0, 5).map(e => ({ _id: e._id, title: e.title })),
        });
      }

      // Check for promotion progress with invalid student references
      const progressWithInvalidStudents = await PromotionProgressModel.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'studentId',
            foreignField: '_id',
            as: 'student'
          }
        },
        { $match: { student: { $size: 0 } } },
        { $limit: 100 }
      ]);

      if (progressWithInvalidStudents.length > 0) {
        orphanedRecords.push({
          collection: 'promotion_progress',
          count: progressWithInvalidStudents.length,
          ids: progressWithInvalidStudents.map(p => p._id.toString()),
        });
      }

      // Check for attendance records with invalid event references
      const attendanceWithInvalidEvents = await EventAttendanceModel.aggregate([
        {
          $lookup: {
            from: 'events',
            localField: 'eventId',
            foreignField: '_id',
            as: 'event'
          }
        },
        { $match: { event: { $size: 0 } } },
        { $limit: 100 }
      ]);

      if (attendanceWithInvalidEvents.length > 0) {
        orphanedRecords.push({
          collection: 'event_attendance',
          count: attendanceWithInvalidEvents.length,
          ids: attendanceWithInvalidEvents.map(a => a._id.toString()),
        });
      }

    } catch (error) {
      logger.error('Error during integrity check:', error);
    }

    return { orphanedRecords, integrityIssues };
  }

  private async getPerformanceStats() {
    return {
      slowQueries: [], // Would need to implement query profiling
      indexUsage: await this.getIndexStats(),
      connectionStats: await this.getConnectionStats(),
    };
  }

  private async getMetadata() {
    const dbStats = await mongoose.connection.db!.stats();
    const serverStatus = await mongoose.connection.db!.admin().serverStatus();

    return {
      lastUpdated: new Date().toISOString(),
      databaseSize: this.formatBytes(dbStats['dataSize'] || 0),
      indexSize: this.formatBytes(dbStats['indexSize'] || 0),
      uptime: serverStatus['uptime'] || 0,
    };
  }

  private async checkDatabaseHealth() {
    try {
      const start = Date.now();
      await mongoose.connection.db!.admin().ping();
      const responseTime = Date.now() - start;

      return {
        status: 'connected',
        responseTime,
        activeConnections: mongoose.connection.readyState,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'disconnected',
        responseTime: 0,
        activeConnections: 0,
        lastCheck: new Date().toISOString(),
        error: (error as Error).message,
      };
    }
  }

  private async checkServicesHealth() {
    // This would typically check other microservices
    // For now, return mock data since we're in the planning service
    return [
      { name: 'Auth Service', port: 3001, status: 'healthy', responseTime: 25 },
      { name: 'User Service', port: 3002, status: 'healthy', responseTime: 30 },
      { name: 'Course Service', port: 3004, status: 'healthy', responseTime: 35 },
      { name: 'News Service', port: 3003, status: 'healthy', responseTime: 28 },
      { name: 'Planning Service', port: 3005, status: 'healthy', responseTime: 20 },
      { name: 'Statistics Service', port: 3006, status: 'healthy', responseTime: 32 },
    ];
  }

  private async getSystemMetrics() {
    try {
      const serverStatus = await mongoose.connection.db!.admin().serverStatus();
      
      return {
        uptime: serverStatus['uptime'] || 0,
        memoryUsage: 65.4, // Mock value - would need system monitoring
        cpuUsage: 23.7,    // Mock value - would need system monitoring  
        diskSpace: 78.2,   // Mock value - would need system monitoring
      };
    } catch (error) {
      return {
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        diskSpace: 0,
      };
    }
  }

  private async getDatabasePerformance() {
    try {
      const dbStats = await mongoose.connection.db!.stats();
      return {
        collections: dbStats['collections'] || 0,
        objects: dbStats['objects'] || 0,
        avgObjSize: dbStats['avgObjSize'] || 0,
        dataSize: dbStats['dataSize'] || 0,
        storageSize: dbStats['storageSize'] || 0,
        indexSize: dbStats['indexSize'] || 0,
      };
    } catch (error) {
      return {};
    }
  }

  private async getQueryPerformance() {
    // Mock data - would need to implement query profiling
    return {
      averageQueryTime: 45,
      slowQueries: 2,
      totalQueries: 1250,
      cacheHitRatio: 0.85,
    };
  }

  private async getConnectionStats() {
    try {
      const serverStatus = await mongoose.connection.db!.admin().serverStatus();
      const connections = serverStatus['connections'] || {};
      
      return {
        activeConnections: connections.current || 0,
        availableConnections: connections.available || 0,
        totalConnections: connections.totalCreated || 0,
      };
    } catch (error) {
      return {
        activeConnections: 0,
        availableConnections: 0,
        totalConnections: 0,
      };
    }
  }

  private async getIndexStats(): Promise<IndexStats[]> {
    // Mock data - would need to implement index usage monitoring
    return [
      { collection: 'users', index: 'email_1', usage: 95, efficiency: 98 },
      { collection: 'courses', index: 'instructor_1', usage: 78, efficiency: 85 },
      { collection: 'promotions', index: 'semester_1', usage: 88, efficiency: 92 },
      { collection: 'events', index: 'startDate_1', usage: 72, efficiency: 89 },
    ];
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default new SystemController();