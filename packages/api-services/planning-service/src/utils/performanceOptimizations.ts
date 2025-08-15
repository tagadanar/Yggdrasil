// packages/api-services/planning-service/src/utils/performanceOptimizations.ts
// Performance optimization utilities for the planning service

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

// =============================================================================
// CACHING UTILITIES
// =============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class InMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
    };
  }
}

// Global cache instance
export const globalCache = new InMemoryCache(500);

// Cache cleanup interval (every 5 minutes)
setInterval(
  () => {
    globalCache.cleanup();
  },
  5 * 60 * 1000,
);

// =============================================================================
// RESPONSE CACHING MIDDLEWARE
// =============================================================================

export function cacheResponse(ttlSeconds: number = 300, keyGenerator?: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `${req.originalUrl}:${JSON.stringify(req.query)}`;

    // Try to get cached response
    const cachedResponse = globalCache.get(cacheKey);
    if (cachedResponse) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedResponse);
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method to cache response
    res.json = function (body: any) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        globalCache.set(cacheKey, body, ttlSeconds);
      }

      res.setHeader('X-Cache', 'MISS');
      return originalJson.call(this, body);
    };

    next();
  };
}

// =============================================================================
// DATABASE QUERY OPTIMIZATIONS
// =============================================================================

export class QueryOptimizer {
  /**
   * Add efficient pagination to mongoose queries
   */
  static addPagination<T>(
    query: mongoose.Query<T[], any>,
    page: number = 1,
    limit: number = 20,
  ): mongoose.Query<T[], any> {
    const skip = (page - 1) * limit;
    return query.skip(skip).limit(Math.min(limit, 100)); // Max 100 items per page
  }

  /**
   * Add sorting with database indexes in mind
   */
  static addOptimalSort<T>(
    query: mongoose.Query<T[], any>,
    sort: string = '-createdAt',
  ): mongoose.Query<T[], any> {
    // Ensure we're using indexed fields for sorting
    const indexedSortFields = [
      'createdAt',
      '-createdAt',
      'updatedAt',
      '-updatedAt',
      'startDate',
      '-startDate',
      'semester',
      '-semester',
      'name',
      '-name',
    ];

    const sortField = indexedSortFields.includes(sort) ? sort : '-createdAt';
    return query.sort(sortField);
  }

  /**
   * Optimize field selection to reduce data transfer
   */
  static selectEssentialFields<T>(
    query: mongoose.Query<T[], any>,
    fields?: string[],
  ): mongoose.Query<T[], any> {
    if (fields && fields.length > 0) {
      return query.select(fields.join(' '));
    }

    // Default essential fields to reduce payload size
    return query.select('_id name title type startDate endDate status createdAt updatedAt');
  }

  /**
   * Optimize population to avoid over-fetching
   */
  static optimizePopulation<T>(
    query: mongoose.Query<T[], any>,
    populations: Array<{ path: string; select?: string }>,
  ): mongoose.Query<T[], any> {
    populations.forEach(pop => {
      const selectFields = pop.select || '_id name title email profile.firstName profile.lastName';
      query.populate(pop.path, selectFields);
    });

    return query;
  }

  /**
   * Build efficient aggregation pipelines
   */
  static buildOptimizedAggregation(matchStage: any = {}): mongoose.PipelineStage[] {
    return [
      // Always match first to reduce dataset
      { $match: matchStage },

      // Use efficient lookups
      {
        $lookup: {
          from: 'users',
          localField: 'studentIds',
          foreignField: '_id',
          as: 'students',
          pipeline: [
            { $project: { _id: 1, email: 1, 'profile.firstName': 1, 'profile.lastName': 1 } },
          ],
        },
      },

      // Sort using indexed fields
      { $sort: { createdAt: -1 } },

      // Project only necessary fields
      {
        $project: {
          _id: 1,
          name: 1,
          semester: 1,
          intake: 1,
          academicYear: 1,
          status: 1,
          studentCount: { $size: '$students' },
          students: { $slice: ['$students', 10] }, // Limit student details
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ];
  }
}

// =============================================================================
// REQUEST/RESPONSE COMPRESSION
// =============================================================================

export function compressLargeResponses() {
  return (_req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function (body: any) {
      // Add response size header for monitoring
      const responseSize = JSON.stringify(body).length;
      res.setHeader('X-Response-Size', responseSize);

      // Suggest compression for large responses
      if (responseSize > 10000) {
        // 10KB threshold
        res.setHeader('X-Compression-Suggested', 'true');
      }

      return originalJson.call(this, body);
    };

    next();
  };
}

// =============================================================================
// CONNECTION POOLING OPTIMIZATION
// =============================================================================

export class ConnectionOptimizer {
  /**
   * Configure optimal MongoDB connection settings
   */
  static getOptimalConnectionOptions(): mongoose.ConnectOptions {
    return {
      // Connection pool settings
      maxPoolSize: 10, // Maximum number of connections
      minPoolSize: 2, // Minimum number of connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity

      // Performance settings
      bufferCommands: false, // Disable command buffering

      // Timeout settings
      serverSelectionTimeoutMS: 5000, // How long to try selecting a server
      socketTimeoutMS: 45000, // How long a send or receive on a socket can take
      connectTimeoutMS: 10000, // How long to wait for initial connection

      // Retry settings
      retryWrites: true,
      retryReads: true,
    };
  }

  /**
   * Monitor connection health
   */
  static monitorConnection(): void {
    const db = mongoose.connection.db;

    if (db) {
      // Log connection stats periodically
      setInterval(async () => {
        try {
          const serverStatus = await db.admin().serverStatus();
          const connections = serverStatus['connections'];

          if (connections.current > connections.available * 0.8) {
            console.warn('High connection usage detected:', {
              current: connections.current,
              available: connections.available,
              percentage: (connections.current / connections.available) * 100,
            });
          }
        } catch (error) {
          console.error('Error monitoring connection:', error);
        }
      }, 60000); // Check every minute
    }
  }
}

// =============================================================================
// BULK OPERATIONS OPTIMIZER
// =============================================================================

export class BulkOperationOptimizer {
  /**
   * Optimize bulk inserts with batching
   */
  static async bulkInsert<T>(
    model: mongoose.Model<T>,
    documents: any[],
    batchSize: number = 100,
  ): Promise<any[]> {
    const results: any[] = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      try {
        const batchResults = await model.insertMany(batch, {
          ordered: false, // Continue on error
          rawResult: true,
        });
        results.push(batchResults);
      } catch (error) {
        console.error(`Batch insert error for batch ${i}-${i + batchSize}:`, error);
        // Continue with next batch
      }
    }

    return results;
  }

  /**
   * Optimize bulk updates with proper indexing
   */
  static async bulkUpdate<T>(
    model: mongoose.Model<T>,
    updates: Array<{ filter: any; update: any }>,
    batchSize: number = 50,
  ): Promise<any[]> {
    const operations = updates.map(({ filter, update }) => ({
      updateOne: {
        filter,
        update,
        upsert: false,
      },
    }));

    const results: any[] = [];

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);

      try {
        const result = await model.bulkWrite(batch, {
          ordered: false,
        });
        results.push(result);
      } catch (error) {
        console.error(`Bulk update error for batch ${i}-${i + batchSize}:`, error);
      }
    }

    return results;
  }
}

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

export function performanceMonitoring() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;

      // Log slow requests
      if (duration > 1000) {
        // Requests taking more than 1 second
        console.warn('Slow request detected:', {
          method: req.method,
          url: req.originalUrl,
          duration: `${duration}ms`,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });
      }

      // Add performance headers
      res.setHeader('X-Response-Time', `${duration}ms`);
    });

    next();
  };
}

// =============================================================================
// MEMORY USAGE OPTIMIZATION
// =============================================================================

export class MemoryOptimizer {
  /**
   * Clean up old cache entries and force garbage collection
   */
  static performCleanup(): void {
    globalCache.cleanup();

    // Force garbage collection if available (development only)
    if (global.gc && process.env['NODE_ENV'] === 'development') {
      global.gc();
    }
  }

  /**
   * Monitor memory usage and alert on high usage
   */
  static monitorMemoryUsage(): void {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

      if (heapUsedMB > 300) {
        // Alert if using more than 300MB
        console.warn('High memory usage detected:', {
          heapUsed: `${heapUsedMB}MB`,
          heapTotal: `${heapTotalMB}MB`,
          percentage: Math.round((heapUsedMB / heapTotalMB) * 100),
        });

        // Perform cleanup
        this.performCleanup();
      }
    }, 30000); // Check every 30 seconds
  }
}
