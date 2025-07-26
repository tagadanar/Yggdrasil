# 🏗️ PHASE 4: ARCHITECTURE IMPROVEMENTS

**Duration**: Year 1 (12 months)
**Priority**: MEDIUM - Long-term scalability and maintainability
**Risk Level**: HIGH - Fundamental architecture changes

## 📋 Phase Overview

This phase transforms the platform architecture from a traditional microservices setup to a modern, event-driven, highly scalable system ready for global deployment and millions of users.

### Timeline Breakdown
- **Months 1-4**: Database Per Service Pattern (4.1)
- **Months 5-8**: Event-Driven Architecture (4.2)
- **Months 9-12**: Service Mesh & Advanced Patterns (4.3)

### Prerequisites
- [x] Phases 1-3 completed successfully
- [x] Production deployment experience
- [x] Performance baselines established
- [ ] Architecture team trained on new patterns
- [ ] Infrastructure budget approved

---

## 🗄️ Months 1-4: Database Per Service Pattern

### Current State Problems
- Single MongoDB instance shared by all services
- Tight coupling through shared schemas
- Scaling bottlenecks
- No true service autonomy
- Cross-service transactions

### Month 1: Planning & Design

#### 1. Service Data Ownership Matrix
```yaml
# Service Data Ownership Definition
services:
  auth-service:
    owns:
      - users (authentication data only)
      - sessions
      - refresh_tokens
      - login_history
    needs:
      - user profiles (from user-service)
    
  user-service:
    owns:
      - user_profiles
      - user_preferences
      - user_contacts
      - user_documents
    needs:
      - basic user info (from auth-service)
      - enrollment data (from course-service)
    
  course-service:
    owns:
      - courses
      - chapters
      - sections
      - exercises
      - course_materials
    needs:
      - teacher info (from user-service)
      - enrollment count (from enrollment-service)
    
  enrollment-service: # New service
    owns:
      - enrollments
      - progress
      - submissions
      - grades
    needs:
      - user info (from user-service)
      - course info (from course-service)
    
  news-service:
    owns:
      - articles
      - categories
      - tags
      - comments
    needs:
      - author info (from user-service)
    
  planning-service:
    owns:
      - events
      - schedules
      - locations
      - resources
    needs:
      - participant info (from user-service)
      - course schedules (from course-service)
    
  statistics-service:
    owns:
      - aggregated_stats
      - reports
      - analytics_events
    needs:
      - data from all services (read-only)
```

#### 2. Data Synchronization Strategy
```typescript
// packages/shared-utilities/src/patterns/data-sync.ts
export enum SyncStrategy {
  EVENTUAL_CONSISTENCY = 'eventual',
  STRONG_CONSISTENCY = 'strong',
  CACHED = 'cached',
  REQUEST_RESPONSE = 'request_response'
}

export interface DataSyncConfig {
  source: string;
  target: string;
  strategy: SyncStrategy;
  fields: string[];
  ttl?: number;
  retryPolicy?: RetryPolicy;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

// Example configurations
export const syncConfigurations: DataSyncConfig[] = [
  {
    source: 'user-service',
    target: 'auth-service',
    strategy: SyncStrategy.STRONG_CONSISTENCY,
    fields: ['email', 'isActive', 'role'],
    retryPolicy: {
      maxAttempts: 5,
      backoffMultiplier: 2,
      maxBackoffMs: 30000
    }
  },
  {
    source: 'user-service',
    target: 'course-service',
    strategy: SyncStrategy.CACHED,
    fields: ['firstName', 'lastName', 'photo', 'department'],
    ttl: 3600000 // 1 hour
  },
  {
    source: 'course-service',
    target: 'statistics-service',
    strategy: SyncStrategy.EVENTUAL_CONSISTENCY,
    fields: ['*'], // All fields for analytics
  }
];
```

### Month 2: Service Separation Implementation

#### 3. Database Connection Management
```typescript
// packages/database-schemas/src/connection/multi-db.ts
import mongoose, { Connection, ConnectOptions } from 'mongoose';
import { config } from '@yggdrasil/shared-utilities/config';
import { logger } from '@yggdrasil/shared-utilities/logging';

export class DatabaseManager {
  private connections: Map<string, Connection> = new Map();
  private readonly defaultOptions: ConnectOptions = {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  async connect(
    serviceName: string,
    uri?: string,
    options?: ConnectOptions
  ): Promise<Connection> {
    // Check if connection already exists
    if (this.connections.has(serviceName)) {
      return this.connections.get(serviceName)!;
    }

    // Build connection URI
    const dbUri = uri || this.getServiceDbUri(serviceName);
    const dbName = this.getServiceDbName(serviceName);

    // Create new connection
    const connection = mongoose.createConnection(dbUri, {
      ...this.defaultOptions,
      ...options,
      dbName
    });

    // Set up event handlers
    this.setupConnectionHandlers(connection, serviceName);

    // Store connection
    this.connections.set(serviceName, connection);

    // Wait for connection to be ready
    await this.waitForConnection(connection, serviceName);

    return connection;
  }

  private getServiceDbUri(serviceName: string): string {
    // Service-specific database URIs
    const serviceDbConfig: Record<string, string> = {
      'auth-service': config.AUTH_DB_URI || config.MONGODB_URI,
      'user-service': config.USER_DB_URI || config.MONGODB_URI,
      'course-service': config.COURSE_DB_URI || config.MONGODB_URI,
      'enrollment-service': config.ENROLLMENT_DB_URI || config.MONGODB_URI,
      'news-service': config.NEWS_DB_URI || config.MONGODB_URI,
      'planning-service': config.PLANNING_DB_URI || config.MONGODB_URI,
      'statistics-service': config.STATS_DB_URI || config.MONGODB_URI,
    };

    return serviceDbConfig[serviceName] || config.MONGODB_URI;
  }

  private getServiceDbName(serviceName: string): string {
    // Database naming convention
    const env = config.NODE_ENV;
    return `yggdrasil_${serviceName.replace('-service', '')}_${env}`;
  }

  private setupConnectionHandlers(connection: Connection, serviceName: string) {
    connection.on('connected', () => {
      logger.info(`Database connected for ${serviceName}`);
    });

    connection.on('error', (err) => {
      logger.error(`Database error for ${serviceName}:`, err);
    });

    connection.on('disconnected', () => {
      logger.warn(`Database disconnected for ${serviceName}`);
      // Implement reconnection logic
      this.handleDisconnection(serviceName);
    });
  }

  private async waitForConnection(
    connection: Connection, 
    serviceName: string
  ): Promise<void> {
    const maxRetries = 5;
    let retries = 0;

    while (connection.readyState !== 1 && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries++;
    }

    if (connection.readyState !== 1) {
      throw new Error(`Failed to connect to database for ${serviceName}`);
    }
  }

  private async handleDisconnection(serviceName: string) {
    // Implement exponential backoff reconnection
    let retryDelay = 1000;
    const maxDelay = 30000;

    const attemptReconnect = async () => {
      try {
        await this.connect(serviceName);
        logger.info(`Reconnected to database for ${serviceName}`);
      } catch (error) {
        logger.error(`Reconnection failed for ${serviceName}:`, error);
        retryDelay = Math.min(retryDelay * 2, maxDelay);
        setTimeout(attemptReconnect, retryDelay);
      }
    };

    setTimeout(attemptReconnect, retryDelay);
  }

  async disconnect(serviceName: string): Promise<void> {
    const connection = this.connections.get(serviceName);
    if (connection) {
      await connection.close();
      this.connections.delete(serviceName);
    }
  }

  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.connections.keys()).map(
      service => this.disconnect(service)
    );
    await Promise.all(promises);
  }

  getConnection(serviceName: string): Connection | undefined {
    return this.connections.get(serviceName);
  }
}

// Singleton instance
export const dbManager = new DatabaseManager();
```

#### 4. Service-Specific Models
```typescript
// packages/api-services/auth-service/src/models/auth-user.ts
import { Schema } from 'mongoose';
import { dbManager } from '@yggdrasil/database-schemas/connection';

// Auth service only stores authentication-related data
const AuthUserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'staff', 'teacher', 'student'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tokenVersion: {
    type: Number,
    default: 0
  },
  lastLogin: Date,
  loginHistory: [{
    timestamp: Date,
    ip: String,
    userAgent: String,
    success: Boolean
  }],
  securitySettings: {
    twoFactorEnabled: Boolean,
    twoFactorSecret: String,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date
  }
}, {
  timestamps: true
});

// Get service-specific connection
const authConnection = await dbManager.connect('auth-service');

// Create model on service-specific connection
export const AuthUser = authConnection.model('AuthUser', AuthUserSchema);
```

### Month 3: Data Migration

#### 5. Migration Strategy Implementation
```typescript
// packages/database-schemas/src/migrations/split-databases.ts
import { Migration } from '../migration-runner';
import mongoose from 'mongoose';
import { dbManager } from '../connection/multi-db';

export default class SplitDatabases extends Migration {
  name = 'split-databases';
  description = 'Split monolithic database into service-specific databases';

  async up() {
    // Phase 1: Create service databases and collections
    await this.createServiceDatabases();
    
    // Phase 2: Copy data to service databases
    await this.migrateData();
    
    // Phase 3: Set up data synchronization
    await this.setupSynchronization();
    
    // Phase 4: Verify data integrity
    await this.verifyMigration();
  }

  private async createServiceDatabases() {
    const services = [
      'auth-service',
      'user-service', 
      'course-service',
      'enrollment-service',
      'news-service',
      'planning-service',
      'statistics-service'
    ];

    for (const service of services) {
      const connection = await dbManager.connect(service);
      logger.info(`Created database for ${service}`);
    }
  }

  private async migrateData() {
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
    const users = await sourceDb.collection('users').find({}).toArray();
    
    // Split user data between auth and user services
    const authConnection = dbManager.getConnection('auth-service');
    const userConnection = dbManager.getConnection('user-service');
    
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
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      await authConnection!.db.collection('authusers').insertOne(authData);
      
      // User service data
      const profileData = {
        _id: user._id,
        authId: user._id, // Reference to auth service
        email: user.email, // Denormalized for queries
        profile: user.profile,
        preferences: user.preferences,
        contactInfo: user.contactInfo,
        metadata: {
          createdBy: user.createdBy,
          updatedBy: user.updatedBy,
          source: 'migration'
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      await userConnection!.db.collection('userprofiles').insertOne(profileData);
    }
    
    logger.info(`Migrated ${users.length} users`);
  }

  private async migrateCourses(sourceDb: any) {
    const courses = await sourceDb.collection('courses').find({}).toArray();
    const courseConnection = dbManager.getConnection('course-service');
    
    // Migrate courses with embedded data
    await courseConnection!.db.collection('courses').insertMany(courses);
    
    logger.info(`Migrated ${courses.length} courses`);
  }

  private async migrateEnrollments(sourceDb: any) {
    const enrollments = await sourceDb.collection('enrollments').find({}).toArray();
    const enrollmentConnection = dbManager.getConnection('enrollment-service');
    
    // Create new enrollment service database
    await enrollmentConnection!.db.collection('enrollments').insertMany(enrollments);
    
    // Also migrate progress and submissions
    const progress = await sourceDb.collection('progress').find({}).toArray();
    if (progress.length > 0) {
      await enrollmentConnection!.db.collection('progress').insertMany(progress);
    }
    
    const submissions = await sourceDb.collection('submissions').find({}).toArray();
    if (submissions.length > 0) {
      await enrollmentConnection!.db.collection('submissions').insertMany(submissions);
    }
    
    logger.info(`Migrated ${enrollments.length} enrollments`);
  }

  private async verifyMigration() {
    // Verify record counts match
    const sourceDb = mongoose.connection.db;
    const services = [
      { name: 'auth-service', collection: 'authusers', source: 'users' },
      { name: 'user-service', collection: 'userprofiles', source: 'users' },
      { name: 'course-service', collection: 'courses', source: 'courses' },
      { name: 'enrollment-service', collection: 'enrollments', source: 'enrollments' },
      { name: 'news-service', collection: 'articles', source: 'news' },
      { name: 'planning-service', collection: 'events', source: 'events' }
    ];
    
    for (const service of services) {
      const sourceCount = await sourceDb.collection(service.source).countDocuments();
      const targetConnection = dbManager.getConnection(service.name);
      const targetCount = await targetConnection!.db
        .collection(service.collection)
        .countDocuments();
      
      if (sourceCount !== targetCount) {
        throw new Error(
          `Migration verification failed for ${service.name}: ` +
          `source=${sourceCount}, target=${targetCount}`
        );
      }
    }
    
    logger.info('Migration verification passed');
  }

  async down() {
    // This is a one-way migration
    throw new Error('Database split cannot be reversed automatically');
  }
}
```

### Month 4: Cross-Service Data Access

#### 6. Service Data Access Patterns
```typescript
// packages/shared-utilities/src/patterns/service-client.ts
import axios, { AxiosInstance } from 'axios';
import CircuitBreaker from 'opossum';
import { Cache } from './cache';
import { logger } from '../logging/logger';

export interface ServiceClientOptions {
  baseURL: string;
  timeout?: number;
  cache?: boolean;
  cacheTTL?: number;
  circuitBreaker?: boolean;
}

export class ServiceClient {
  private axios: AxiosInstance;
  private breaker?: CircuitBreaker;
  private cache?: Cache;

  constructor(
    private serviceName: string,
    options: ServiceClientOptions
  ) {
    this.axios = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout || 5000,
      headers: {
        'X-Service-Name': process.env.SERVICE_NAME || 'unknown',
        'X-Service-Version': process.env.SERVICE_VERSION || '1.0.0'
      }
    });

    if (options.cache) {
      this.cache = new Cache({
        ttl: options.cacheTTL || 60000,
        max: 1000
      });
    }

    if (options.circuitBreaker) {
      this.setupCircuitBreaker();
    }

    this.setupInterceptors();
  }

  private setupCircuitBreaker() {
    const options = {
      timeout: 3000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    };

    this.breaker = new CircuitBreaker(
      (config: any) => this.axios.request(config),
      options
    );

    this.breaker.on('open', () => {
      logger.warn(`Circuit breaker opened for ${this.serviceName}`);
    });

    this.breaker.on('halfOpen', () => {
      logger.info(`Circuit breaker half-open for ${this.serviceName}`);
    });

    this.breaker.on('close', () => {
      logger.info(`Circuit breaker closed for ${this.serviceName}`);
    });
  }

  private setupInterceptors() {
    // Request interceptor for tracing
    this.axios.interceptors.request.use(
      (config) => {
        config.headers['X-Request-ID'] = config.headers['X-Request-ID'] || 
          require('uuid').v4();
        config.headers['X-Request-Start'] = Date.now().toString();
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for metrics
    this.axios.interceptors.response.use(
      (response) => {
        const duration = Date.now() - 
          parseInt(response.config.headers['X-Request-Start']);
        
        logger.debug(`${this.serviceName} request completed`, {
          method: response.config.method,
          url: response.config.url,
          status: response.status,
          duration
        });

        return response;
      },
      (error) => {
        logger.error(`${this.serviceName} request failed`, {
          method: error.config?.method,
          url: error.config?.url,
          status: error.response?.status,
          message: error.message
        });

        return Promise.reject(error);
      }
    );
  }

  async get<T>(path: string, options?: any): Promise<T> {
    const cacheKey = `GET:${path}:${JSON.stringify(options?.params || {})}`;
    
    // Check cache
    if (this.cache) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached) return cached;
    }

    // Make request
    const response = await this.request<T>({
      method: 'GET',
      url: path,
      ...options
    });

    // Cache response
    if (this.cache && response) {
      this.cache.set(cacheKey, response);
    }

    return response;
  }

  async post<T>(path: string, data?: any, options?: any): Promise<T> {
    return this.request<T>({
      method: 'POST',
      url: path,
      data,
      ...options
    });
  }

  async put<T>(path: string, data?: any, options?: any): Promise<T> {
    return this.request<T>({
      method: 'PUT',
      url: path,
      data,
      ...options
    });
  }

  async delete<T>(path: string, options?: any): Promise<T> {
    return this.request<T>({
      method: 'DELETE',
      url: path,
      ...options
    });
  }

  private async request<T>(config: any): Promise<T> {
    try {
      let response;
      
      if (this.breaker) {
        response = await this.breaker.fire(config);
      } else {
        response = await this.axios.request(config);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ServiceClientError(
          this.serviceName,
          error.response?.status || 0,
          error.response?.data?.error?.message || error.message
        );
      }
      throw error;
    }
  }

  // Invalidate cache
  invalidateCache(pattern?: string) {
    if (this.cache) {
      if (pattern) {
        this.cache.deletePattern(pattern);
      } else {
        this.cache.clear();
      }
    }
  }
}

export class ServiceClientError extends Error {
  constructor(
    public service: string,
    public statusCode: number,
    message: string
  ) {
    super(`${service} error (${statusCode}): ${message}`);
    this.name = 'ServiceClientError';
  }
}

// Service client factory
export class ServiceClientFactory {
  private static clients = new Map<string, ServiceClient>();

  static create(serviceName: string, options: ServiceClientOptions): ServiceClient {
    const key = `${serviceName}:${options.baseURL}`;
    
    if (!this.clients.has(key)) {
      this.clients.set(key, new ServiceClient(serviceName, options));
    }
    
    return this.clients.get(key)!;
  }

  static getUserServiceClient(): ServiceClient {
    return this.create('user-service', {
      baseURL: process.env.USER_SERVICE_URL || 'http://localhost:3002',
      cache: true,
      cacheTTL: 300000, // 5 minutes
      circuitBreaker: true
    });
  }

  static getCourseServiceClient(): ServiceClient {
    return this.create('course-service', {
      baseURL: process.env.COURSE_SERVICE_URL || 'http://localhost:3004',
      cache: true,
      cacheTTL: 600000, // 10 minutes
      circuitBreaker: true
    });
  }
}
```

#### 7. Data Aggregation Service
```typescript
// packages/api-services/aggregation-service/src/services/DataAggregator.ts
import { ServiceClientFactory } from '@yggdrasil/shared-utilities/patterns';
import { Cache } from '@yggdrasil/shared-utilities/cache';

export class DataAggregator {
  private cache: Cache;
  private userClient = ServiceClientFactory.getUserServiceClient();
  private courseClient = ServiceClientFactory.getCourseServiceClient();
  private enrollmentClient = ServiceClientFactory.getEnrollmentServiceClient();

  constructor() {
    this.cache = new Cache({
      ttl: 60000, // 1 minute
      max: 5000
    });
  }

  async getUserWithEnrollments(userId: string) {
    const cacheKey = `user:${userId}:enrollments`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Parallel data fetching
      const [user, enrollments] = await Promise.all([
        this.userClient.get(`/users/${userId}`),
        this.enrollmentClient.get(`/enrollments/user/${userId}`)
      ]);

      // Fetch course details for enrollments
      const courseIds = enrollments.map(e => e.courseId);
      const courses = await Promise.all(
        courseIds.map(id => this.courseClient.get(`/courses/${id}`))
      );

      // Aggregate data
      const result = {
        ...user,
        enrollments: enrollments.map((enrollment, index) => ({
          ...enrollment,
          course: courses[index]
        }))
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Failed to aggregate user data:', error);
      throw new AggregationError('Failed to fetch user with enrollments');
    }
  }

  async getCourseWithInstructor(courseId: string) {
    const cacheKey = `course:${courseId}:instructor`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const course = await this.courseClient.get(`/courses/${courseId}`);
      const instructor = await this.userClient.get(`/users/${course.teacherId}`);

      const result = {
        ...course,
        instructor
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Failed to aggregate course data:', error);
      throw new AggregationError('Failed to fetch course with instructor');
    }
  }

  // GraphQL-like field selection
  async getUser(userId: string, fields: string[]) {
    const baseFields = ['id', 'email', 'role', 'profile'];
    const aggregateFields = fields.filter(f => !baseFields.includes(f));
    
    // Get base user data
    const user = await this.userClient.get(`/users/${userId}`);
    
    // Aggregate additional data based on requested fields
    const aggregated: any = { ...user };
    
    if (aggregateFields.includes('enrollments')) {
      aggregated.enrollments = await this.enrollmentClient.get(
        `/enrollments/user/${userId}`
      );
    }
    
    if (aggregateFields.includes('statistics')) {
      aggregated.statistics = await this.getStatistics(userId);
    }
    
    return aggregated;
  }
}
```

---

## 📡 Months 5-8: Event-Driven Architecture

### Month 5: Event Infrastructure

#### 1. Event Bus Implementation
```typescript
// packages/shared-utilities/src/events/event-bus.ts
import { EventEmitter } from 'events';
import amqp, { Connection, Channel } from 'amqplib';
import { logger } from '../logging/logger';

export interface Event {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

export interface EventHandler<T = any> {
  (event: Event<T>): Promise<void> | void;
}

export class EventBus {
  private connection?: Connection;
  private channel?: Channel;
  private localEmitter = new EventEmitter();
  private handlers = new Map<string, Set<EventHandler>>();
  private readonly exchange = 'yggdrasil.events';

  constructor(
    private serviceName: string,
    private amqpUrl: string
  ) {}

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.amqpUrl);
      this.channel = await this.connection.createChannel();

      // Create exchange
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true
      });

      // Create service queue
      const queue = await this.channel.assertQueue(
        `${this.serviceName}.events`,
        {
          durable: true,
          arguments: {
            'x-message-ttl': 3600000, // 1 hour
            'x-max-length': 10000
          }
        }
      );

      // Set up consumer
      await this.channel.consume(queue.queue, async (msg) => {
        if (!msg) return;

        try {
          const event: Event = JSON.parse(msg.content.toString());
          await this.handleEvent(event);
          this.channel!.ack(msg);
        } catch (error) {
          logger.error('Failed to process event:', error);
          // Requeue on error
          this.channel!.nack(msg, false, true);
        }
      });

      logger.info(`Event bus connected for ${this.serviceName}`);
    } catch (error) {
      logger.error('Failed to connect to event bus:', error);
      throw error;
    }
  }

  async publish(event: Omit<Event, 'id' | 'timestamp' | 'source'>): Promise<void> {
    const fullEvent: Event = {
      ...event,
      id: require('uuid').v4(),
      timestamp: new Date(),
      source: this.serviceName
    };

    // Publish to RabbitMQ
    if (this.channel) {
      const routingKey = `${this.serviceName}.${event.type}`;
      this.channel.publish(
        this.exchange,
        routingKey,
        Buffer.from(JSON.stringify(fullEvent)),
        {
          persistent: true,
          contentType: 'application/json'
        }
      );
    }

    // Also emit locally for same-service handlers
    this.localEmitter.emit(event.type, fullEvent);

    logger.debug(`Published event: ${event.type}`, {
      eventId: fullEvent.id,
      data: fullEvent.data
    });
  }

  subscribe(pattern: string, handler: EventHandler): void {
    // Subscribe to RabbitMQ pattern
    if (this.channel) {
      this.channel.bindQueue(
        `${this.serviceName}.events`,
        this.exchange,
        pattern
      );
    }

    // Store handler
    const eventType = pattern.split('.').pop() || pattern;
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Also subscribe to local events
    this.localEmitter.on(eventType, handler);
  }

  private async handleEvent(event: Event): Promise<void> {
    const handlers = this.handlers.get(event.type);
    if (!handlers || handlers.size === 0) {
      logger.warn(`No handlers for event type: ${event.type}`);
      return;
    }

    // Execute handlers in parallel
    const promises = Array.from(handlers).map(handler => 
      Promise.resolve(handler(event)).catch(error => {
        logger.error(`Handler error for ${event.type}:`, error);
      })
    );

    await Promise.all(promises);
  }

  async disconnect(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}

// Event types
export namespace Events {
  export interface UserCreated {
    userId: string;
    email: string;
    role: string;
  }

  export interface UserUpdated {
    userId: string;
    changes: Record<string, any>;
  }

  export interface UserDeleted {
    userId: string;
  }

  export interface CourseCreated {
    courseId: string;
    teacherId: string;
    title: string;
  }

  export interface EnrollmentCreated {
    enrollmentId: string;
    userId: string;
    courseId: string;
  }

  export interface ProgressUpdated {
    userId: string;
    courseId: string;
    progress: number;
  }

  export interface CertificateIssued {
    userId: string;
    courseId: string;
    certificateId: string;
  }
}
```

#### 2. Event Sourcing Implementation
```typescript
// packages/shared-utilities/src/events/event-store.ts
import mongoose, { Schema, Document } from 'mongoose';
import { Event } from './event-bus';

interface StoredEvent extends Document {
  eventId: string;
  type: string;
  source: string;
  timestamp: Date;
  data: any;
  metadata: Record<string, any>;
  aggregateId?: string;
  aggregateType?: string;
  version?: number;
}

const EventSchema = new Schema<StoredEvent>({
  eventId: { type: String, required: true, unique: true },
  type: { type: String, required: true, index: true },
  source: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  data: { type: Schema.Types.Mixed, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  aggregateId: { type: String, index: true },
  aggregateType: { type: String, index: true },
  version: { type: Number }
}, {
  collection: 'events',
  timestamps: false
});

// Compound indexes for queries
EventSchema.index({ aggregateId: 1, version: 1 });
EventSchema.index({ type: 1, timestamp: -1 });

export class EventStore {
  private model: mongoose.Model<StoredEvent>;

  constructor(connection: mongoose.Connection) {
    this.model = connection.model<StoredEvent>('Event', EventSchema);
  }

  async append(event: Event, aggregateId?: string, aggregateType?: string): Promise<void> {
    const version = aggregateId 
      ? await this.getNextVersion(aggregateId)
      : undefined;

    await this.model.create({
      eventId: event.id,
      type: event.type,
      source: event.source,
      timestamp: event.timestamp,
      data: event.data,
      metadata: event.metadata || {},
      aggregateId,
      aggregateType,
      version
    });
  }

  async getEvents(
    aggregateId: string,
    fromVersion?: number,
    toVersion?: number
  ): Promise<Event[]> {
    const query: any = { aggregateId };
    
    if (fromVersion !== undefined) {
      query.version = { $gte: fromVersion };
    }
    
    if (toVersion !== undefined) {
      query.version = { ...query.version, $lte: toVersion };
    }

    const events = await this.model
      .find(query)
      .sort({ version: 1 })
      .lean();

    return events.map(e => ({
      id: e.eventId,
      type: e.type,
      source: e.source,
      timestamp: e.timestamp,
      data: e.data,
      metadata: e.metadata
    }));
  }

  async getEventsByType(
    type: string,
    from?: Date,
    to?: Date,
    limit = 100
  ): Promise<Event[]> {
    const query: any = { type };
    
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = from;
      if (to) query.timestamp.$lte = to;
    }

    const events = await this.model
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return events.map(e => ({
      id: e.eventId,
      type: e.type,
      source: e.source,
      timestamp: e.timestamp,
      data: e.data,
      metadata: e.metadata
    }));
  }

  private async getNextVersion(aggregateId: string): Promise<number> {
    const lastEvent = await this.model
      .findOne({ aggregateId })
      .sort({ version: -1 })
      .select('version');

    return lastEvent ? lastEvent.version! + 1 : 1;
  }

  // Snapshot support
  async saveSnapshot(
    aggregateId: string,
    aggregateType: string,
    data: any,
    version: number
  ): Promise<void> {
    await this.append({
      id: require('uuid').v4(),
      type: `${aggregateType}.snapshot`,
      source: 'event-store',
      timestamp: new Date(),
      data,
      metadata: { snapshotVersion: version }
    }, aggregateId, aggregateType);
  }

  async getLatestSnapshot(aggregateId: string): Promise<{
    data: any;
    version: number;
  } | null> {
    const snapshot = await this.model
      .findOne({
        aggregateId,
        type: { $regex: /\.snapshot$/ }
      })
      .sort({ version: -1 })
      .lean();

    if (!snapshot) return null;

    return {
      data: snapshot.data,
      version: snapshot.metadata.snapshotVersion
    };
  }
}
```

### Month 6: Event-Driven Services

#### 3. Saga Pattern Implementation
```typescript
// packages/shared-utilities/src/patterns/saga.ts
import { EventBus, Event } from '../events/event-bus';
import { logger } from '../logging/logger';

export interface SagaStep<T = any> {
  name: string;
  execute(data: T): Promise<any>;
  compensate(data: T, error?: Error): Promise<void>;
}

export abstract class Saga<T = any> {
  protected abstract steps: SagaStep<T>[];
  private completedSteps: string[] = [];

  constructor(
    protected eventBus: EventBus,
    protected sagaId: string
  ) {}

  async execute(data: T): Promise<void> {
    logger.info(`Starting saga: ${this.sagaId}`);
    
    try {
      // Execute all steps
      for (const step of this.steps) {
        logger.debug(`Executing step: ${step.name}`);
        
        await this.eventBus.publish({
          type: `saga.${this.sagaId}.step.started`,
          data: { step: step.name, sagaId: this.sagaId }
        });

        try {
          await step.execute(data);
          this.completedSteps.push(step.name);
          
          await this.eventBus.publish({
            type: `saga.${this.sagaId}.step.completed`,
            data: { step: step.name, sagaId: this.sagaId }
          });
        } catch (error) {
          logger.error(`Step ${step.name} failed:`, error);
          
          await this.eventBus.publish({
            type: `saga.${this.sagaId}.step.failed`,
            data: { 
              step: step.name, 
              sagaId: this.sagaId,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          });

          // Compensate all completed steps
          await this.compensate(data, error as Error);
          throw error;
        }
      }

      // Saga completed successfully
      await this.eventBus.publish({
        type: `saga.${this.sagaId}.completed`,
        data: { sagaId: this.sagaId, result: data }
      });

      logger.info(`Saga completed: ${this.sagaId}`);
    } catch (error) {
      await this.eventBus.publish({
        type: `saga.${this.sagaId}.failed`,
        data: { 
          sagaId: this.sagaId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    }
  }

  private async compensate(data: T, originalError: Error): Promise<void> {
    logger.info(`Compensating saga: ${this.sagaId}`);

    // Compensate in reverse order
    const stepsToCompensate = this.steps
      .filter(step => this.completedSteps.includes(step.name))
      .reverse();

    for (const step of stepsToCompensate) {
      try {
        logger.debug(`Compensating step: ${step.name}`);
        await step.compensate(data, originalError);
        
        await this.eventBus.publish({
          type: `saga.${this.sagaId}.step.compensated`,
          data: { step: step.name, sagaId: this.sagaId }
        });
      } catch (error) {
        logger.error(`Failed to compensate step ${step.name}:`, error);
        
        await this.eventBus.publish({
          type: `saga.${this.sagaId}.compensation.failed`,
          data: { 
            step: step.name, 
            sagaId: this.sagaId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }
  }
}

// Example: Course Enrollment Saga
export class CourseEnrollmentSaga extends Saga {
  protected steps = [
    {
      name: 'check-prerequisites',
      execute: async (data: any) => {
        // Check if user meets course prerequisites
        const prereqs = await this.checkPrerequisites(data.userId, data.courseId);
        if (!prereqs.met) {
          throw new Error(`Prerequisites not met: ${prereqs.missing.join(', ')}`);
        }
      },
      compensate: async () => {
        // No compensation needed
      }
    },
    {
      name: 'check-capacity',
      execute: async (data: any) => {
        // Check course capacity
        const available = await this.checkCapacity(data.courseId);
        if (!available) {
          throw new Error('Course is full');
        }
        // Reserve seat
        await this.reserveSeat(data.courseId, data.userId);
      },
      compensate: async (data: any) => {
        // Release reserved seat
        await this.releaseSeat(data.courseId, data.userId);
      }
    },
    {
      name: 'process-payment',
      execute: async (data: any) => {
        // Process payment
        const payment = await this.processPayment(data.userId, data.courseId, data.amount);
        data.paymentId = payment.id;
      },
      compensate: async (data: any) => {
        // Refund payment
        if (data.paymentId) {
          await this.refundPayment(data.paymentId);
        }
      }
    },
    {
      name: 'create-enrollment',
      execute: async (data: any) => {
        // Create enrollment record
        const enrollment = await this.createEnrollment(data.userId, data.courseId);
        data.enrollmentId = enrollment.id;
      },
      compensate: async (data: any) => {
        // Delete enrollment
        if (data.enrollmentId) {
          await this.deleteEnrollment(data.enrollmentId);
        }
      }
    },
    {
      name: 'notify-user',
      execute: async (data: any) => {
        // Send confirmation email
        await this.sendConfirmation(data.userId, data.courseId, data.enrollmentId);
      },
      compensate: async (data: any) => {
        // Send cancellation email
        await this.sendCancellation(data.userId, data.courseId);
      }
    }
  ];

  // Implementation methods...
}
```

### Month 7: CQRS Implementation

#### 4. Command and Query Separation
```typescript
// packages/shared-utilities/src/patterns/cqrs.ts
export interface Command {
  id: string;
  type: string;
  data: any;
  metadata?: Record<string, any>;
}

export interface Query {
  type: string;
  filters?: Record<string, any>;
  projection?: string[];
  sort?: Record<string, 1 | -1>;
  limit?: number;
  offset?: number;
}

export interface CommandHandler<T = any, R = any> {
  handle(command: Command<T>): Promise<R>;
}

export interface QueryHandler<T = any, R = any> {
  handle(query: Query<T>): Promise<R>;
}

export class CommandBus {
  private handlers = new Map<string, CommandHandler>();

  register(commandType: string, handler: CommandHandler): void {
    this.handlers.set(commandType, handler);
  }

  async execute<T, R>(command: Command<T>): Promise<R> {
    const handler = this.handlers.get(command.type);
    if (!handler) {
      throw new Error(`No handler registered for command: ${command.type}`);
    }

    logger.info(`Executing command: ${command.type}`, {
      commandId: command.id,
      data: command.data
    });

    try {
      const result = await handler.handle(command);
      
      logger.info(`Command executed successfully: ${command.type}`, {
        commandId: command.id
      });

      return result;
    } catch (error) {
      logger.error(`Command failed: ${command.type}`, {
        commandId: command.id,
        error
      });
      throw error;
    }
  }
}

export class QueryBus {
  private handlers = new Map<string, QueryHandler>();

  register(queryType: string, handler: QueryHandler): void {
    this.handlers.set(queryType, handler);
  }

  async execute<T, R>(query: Query<T>): Promise<R> {
    const handler = this.handlers.get(query.type);
    if (!handler) {
      throw new Error(`No handler registered for query: ${query.type}`);
    }

    logger.debug(`Executing query: ${query.type}`, { query });

    try {
      return await handler.handle(query);
    } catch (error) {
      logger.error(`Query failed: ${query.type}`, { query, error });
      throw error;
    }
  }
}

// Example: User CQRS Implementation
export namespace UserCQRS {
  // Commands
  export class CreateUserCommand implements Command {
    id = require('uuid').v4();
    type = 'user.create';
    
    constructor(
      public data: {
        email: string;
        password: string;
        role: string;
        profile: any;
      }
    ) {}
  }

  export class UpdateUserCommand implements Command {
    id = require('uuid').v4();
    type = 'user.update';
    
    constructor(
      public data: {
        userId: string;
        updates: Partial<any>;
      }
    ) {}
  }

  export class DeleteUserCommand implements Command {
    id = require('uuid').v4();
    type = 'user.delete';
    
    constructor(
      public data: {
        userId: string;
      }
    ) {}
  }

  // Queries
  export class GetUserQuery implements Query {
    type = 'user.get';
    
    constructor(
      public filters: { userId: string },
      public projection?: string[]
    ) {}
  }

  export class ListUsersQuery implements Query {
    type = 'user.list';
    
    constructor(
      public filters?: Record<string, any>,
      public sort?: Record<string, 1 | -1>,
      public limit?: number,
      public offset?: number
    ) {}
  }

  // Command Handlers
  export class CreateUserHandler implements CommandHandler<CreateUserCommand['data']> {
    constructor(
      private userRepository: any,
      private eventBus: EventBus
    ) {}

    async handle(command: Command<CreateUserCommand['data']>): Promise<any> {
      // Create user in write model
      const user = await this.userRepository.create(command.data);

      // Publish event
      await this.eventBus.publish({
        type: 'user.created',
        data: {
          userId: user.id,
          email: user.email,
          role: user.role
        }
      });

      return user;
    }
  }

  // Query Handlers
  export class GetUserHandler implements QueryHandler {
    constructor(private readModel: any) {}

    async handle(query: Query): Promise<any> {
      return this.readModel.findOne(query.filters, query.projection);
    }
  }

  export class ListUsersHandler implements QueryHandler {
    constructor(private readModel: any) {}

    async handle(query: Query): Promise<any> {
      return this.readModel.find(
        query.filters || {},
        query.projection,
        {
          sort: query.sort,
          limit: query.limit,
          skip: query.offset
        }
      );
    }
  }
}
```

### Month 8: Read Model Projections

#### 5. Projection Service
```typescript
// packages/api-services/projection-service/src/ProjectionEngine.ts
import { EventBus, Event } from '@yggdrasil/shared-utilities/events';
import { logger } from '@yggdrasil/shared-utilities/logging';

export interface Projection {
  name: string;
  events: string[];
  handle(event: Event): Promise<void>;
  rebuild?(): Promise<void>;
}

export class ProjectionEngine {
  private projections = new Map<string, Projection>();
  private positions = new Map<string, number>();

  constructor(
    private eventBus: EventBus,
    private eventStore: EventStore,
    private positionStore: PositionStore
  ) {}

  register(projection: Projection): void {
    this.projections.set(projection.name, projection);
    
    // Subscribe to events
    projection.events.forEach(eventType => {
      this.eventBus.subscribe(eventType, async (event) => {
        await this.handleEvent(projection, event);
      });
    });

    logger.info(`Registered projection: ${projection.name}`);
  }

  private async handleEvent(projection: Projection, event: Event): Promise<void> {
    try {
      // Process event
      await projection.handle(event);

      // Update position
      await this.positionStore.update(projection.name, event.id);

      logger.debug(`Projection ${projection.name} processed event ${event.type}`);
    } catch (error) {
      logger.error(`Projection ${projection.name} failed to process event:`, error);
      throw error;
    }
  }

  async rebuild(projectionName: string, fromPosition?: string): Promise<void> {
    const projection = this.projections.get(projectionName);
    if (!projection) {
      throw new Error(`Projection not found: ${projectionName}`);
    }

    logger.info(`Rebuilding projection: ${projectionName}`);

    // Clear existing data if rebuild method exists
    if (projection.rebuild) {
      await projection.rebuild();
    }

    // Get all events from event store
    const events = await this.eventStore.getAllEvents(fromPosition);

    // Process events in order
    for (const event of events) {
      if (projection.events.includes(event.type)) {
        await this.handleEvent(projection, event);
      }
    }

    logger.info(`Projection rebuilt: ${projectionName}`);
  }

  async catchUp(projectionName: string): Promise<void> {
    const projection = this.projections.get(projectionName);
    if (!projection) {
      throw new Error(`Projection not found: ${projectionName}`);
    }

    // Get last processed position
    const position = await this.positionStore.get(projectionName);

    // Get events since position
    const events = await this.eventStore.getEventsSince(position);

    // Process missed events
    for (const event of events) {
      if (projection.events.includes(event.type)) {
        await this.handleEvent(projection, event);
      }
    }
  }
}

// Example projections
export class UserProfileProjection implements Projection {
  name = 'user-profiles';
  events = ['user.created', 'user.updated', 'user.deleted'];

  constructor(private profileStore: any) {}

  async handle(event: Event): Promise<void> {
    switch (event.type) {
      case 'user.created':
        await this.profileStore.create({
          userId: event.data.userId,
          email: event.data.email,
          role: event.data.role,
          profile: event.data.profile,
          createdAt: event.timestamp
        });
        break;

      case 'user.updated':
        await this.profileStore.update(
          event.data.userId,
          event.data.changes
        );
        break;

      case 'user.deleted':
        await this.profileStore.delete(event.data.userId);
        break;
    }
  }

  async rebuild(): Promise<void> {
    await this.profileStore.clear();
  }
}

export class CourseEnrollmentProjection implements Projection {
  name = 'course-enrollments';
  events = [
    'enrollment.created',
    'enrollment.cancelled',
    'progress.updated',
    'certificate.issued'
  ];

  constructor(private enrollmentView: any) {}

  async handle(event: Event): Promise<void> {
    switch (event.type) {
      case 'enrollment.created':
        await this.enrollmentView.create({
          enrollmentId: event.data.enrollmentId,
          userId: event.data.userId,
          courseId: event.data.courseId,
          enrolledAt: event.timestamp,
          status: 'active',
          progress: 0
        });
        break;

      case 'enrollment.cancelled':
        await this.enrollmentView.update(
          event.data.enrollmentId,
          { status: 'cancelled', cancelledAt: event.timestamp }
        );
        break;

      case 'progress.updated':
        await this.enrollmentView.updateProgress(
          event.data.userId,
          event.data.courseId,
          event.data.progress
        );
        break;

      case 'certificate.issued':
        await this.enrollmentView.update(
          event.data.enrollmentId,
          {
            status: 'completed',
            completedAt: event.timestamp,
            certificateId: event.data.certificateId
          }
        );
        break;
    }
  }
}
```

---

## 🕸️ Months 9-12: Service Mesh & Advanced Patterns

### Month 9: Service Mesh Implementation

#### 1. Service Mesh Configuration
```yaml
# kubernetes/istio/virtual-services.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: auth-service
  namespace: yggdrasil
spec:
  hosts:
  - auth-service
  http:
  - match:
    - headers:
        x-version:
          exact: v2
    route:
    - destination:
        host: auth-service
        subset: v2
      weight: 100
  - route:
    - destination:
        host: auth-service
        subset: v1
      weight: 90
    - destination:
        host: auth-service
        subset: v2
      weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: auth-service
  namespace: yggdrasil
spec:
  host: auth-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 100
    loadBalancer:
      simple: LEAST_REQUEST
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

#### 2. Service Discovery & Load Balancing
```typescript
// packages/shared-utilities/src/mesh/service-discovery.ts
import { Consul } from 'consul';
import { EventEmitter } from 'events';

export interface ServiceInstance {
  id: string;
  name: string;
  address: string;
  port: number;
  tags: string[];
  meta: Record<string, string>;
  health: 'passing' | 'warning' | 'critical';
}

export class ServiceDiscovery extends EventEmitter {
  private consul: Consul;
  private services = new Map<string, ServiceInstance[]>();
  private watchers = new Map<string, any>();

  constructor(consulOptions?: any) {
    super();
    this.consul = new Consul(consulOptions || {
      host: process.env.CONSUL_HOST || 'localhost',
      port: process.env.CONSUL_PORT || '8500'
    });
  }

  async register(service: {
    name: string;
    id?: string;
    address?: string;
    port: number;
    tags?: string[];
    meta?: Record<string, string>;
    check?: {
      http?: string;
      interval?: string;
      timeout?: string;
    };
  }): Promise<void> {
    const registration = {
      name: service.name,
      id: service.id || `${service.name}-${require('uuid').v4()}`,
      address: service.address || require('ip').address(),
      port: service.port,
      tags: service.tags || [],
      meta: service.meta || {},
      check: service.check || {
        http: `http://localhost:${service.port}/health`,
        interval: '10s',
        timeout: '5s'
      }
    };

    await this.consul.agent.service.register(registration);
    logger.info(`Service registered: ${registration.name} (${registration.id})`);

    // Set up deregistration on shutdown
    process.on('SIGINT', async () => {
      await this.deregister(registration.id);
    });
  }

  async deregister(serviceId: string): Promise<void> {
    await this.consul.agent.service.deregister(serviceId);
    logger.info(`Service deregistered: ${serviceId}`);
  }

  async discover(serviceName: string): Promise<ServiceInstance[]> {
    const result = await this.consul.health.service(serviceName);
    
    const instances: ServiceInstance[] = result.map((item: any) => ({
      id: item.Service.ID,
      name: item.Service.Service,
      address: item.Service.Address,
      port: item.Service.Port,
      tags: item.Service.Tags || [],
      meta: item.Service.Meta || {},
      health: this.getHealthStatus(item.Checks)
    }));

    // Filter healthy instances
    const healthyInstances = instances.filter(i => i.health === 'passing');
    
    // Cache results
    this.services.set(serviceName, healthyInstances);
    
    return healthyInstances;
  }

  watch(serviceName: string): void {
    if (this.watchers.has(serviceName)) {
      return;
    }

    const watcher = this.consul.watch({
      method: this.consul.health.service,
      options: { service: serviceName }
    });

    watcher.on('change', async (data: any) => {
      const instances = await this.discover(serviceName);
      this.emit('change', { service: serviceName, instances });
    });

    watcher.on('error', (err: Error) => {
      logger.error(`Service watch error for ${serviceName}:`, err);
      this.emit('error', { service: serviceName, error: err });
    });

    this.watchers.set(serviceName, watcher);
  }

  unwatch(serviceName: string): void {
    const watcher = this.watchers.get(serviceName);
    if (watcher) {
      watcher.end();
      this.watchers.delete(serviceName);
    }
  }

  private getHealthStatus(checks: any[]): 'passing' | 'warning' | 'critical' {
    if (checks.some(c => c.Status === 'critical')) return 'critical';
    if (checks.some(c => c.Status === 'warning')) return 'warning';
    return 'passing';
  }

  // Load balancing strategies
  getRandomInstance(serviceName: string): ServiceInstance | null {
    const instances = this.services.get(serviceName) || [];
    if (instances.length === 0) return null;
    
    const index = Math.floor(Math.random() * instances.length);
    return instances[index];
  }

  getRoundRobinInstance(serviceName: string): ServiceInstance | null {
    const instances = this.services.get(serviceName) || [];
    if (instances.length === 0) return null;
    
    const key = `${serviceName}_rr_index`;
    const index = (this[key] || 0) % instances.length;
    this[key] = index + 1;
    
    return instances[index];
  }

  getLeastConnectionsInstance(
    serviceName: string,
    connectionCounts: Map<string, number>
  ): ServiceInstance | null {
    const instances = this.services.get(serviceName) || [];
    if (instances.length === 0) return null;
    
    let leastConnections = Infinity;
    let selectedInstance: ServiceInstance | null = null;
    
    for (const instance of instances) {
      const connections = connectionCounts.get(instance.id) || 0;
      if (connections < leastConnections) {
        leastConnections = connections;
        selectedInstance = instance;
      }
    }
    
    return selectedInstance;
  }
}
```

### Month 10: Advanced Caching

#### 3. Distributed Cache Implementation
```typescript
// packages/shared-utilities/src/cache/distributed-cache.ts
import Redis, { Cluster } from 'ioredis';
import { promisify } from 'util';
import { logger } from '../logging/logger';

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
  namespace?: string;
  compression?: boolean;
}

export class DistributedCache {
  private client: Redis | Cluster;
  private prefix: string;
  private defaultTTL: number;

  constructor(
    redisOptions: any,
    options: CacheOptions = {}
  ) {
    this.client = Array.isArray(redisOptions)
      ? new Redis.Cluster(redisOptions)
      : new Redis(redisOptions);
    
    this.prefix = options.prefix || 'cache';
    this.defaultTTL = options.ttl || 3600; // 1 hour

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    this.client.on('connect', () => {
      logger.info('Redis connected');
    });
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(this.getKey(key));
      if (!data) return null;

      return JSON.parse(data);
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    ttl?: number
  ): Promise<boolean> {
    try {
      const data = JSON.stringify(value);
      const ttlSeconds = ttl || this.defaultTTL;

      await this.client.setex(
        this.getKey(key),
        ttlSeconds,
        data
      );

      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(this.getKey(key));
      return result > 0;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.scanKeys(`${this.prefix}:${pattern}`);
      if (keys.length === 0) return 0;

      const result = await this.client.del(...keys);
      return result;
    } catch (error) {
      logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    const stream = this.client.scanStream({
      match: pattern,
      count: 100
    });

    return new Promise((resolve, reject) => {
      stream.on('data', (resultKeys) => {
        keys.push(...resultKeys);
      });

      stream.on('end', () => {
        resolve(keys);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  // Cache-aside pattern
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Get from source
    const value = await factory();

    // Set in cache
    await this.set(key, value, ttl);

    return value;
  }

  // Write-through pattern
  async writeThrough<T>(
    key: string,
    value: T,
    persist: (value: T) => Promise<void>,
    ttl?: number
  ): Promise<void> {
    // Write to persistent store first
    await persist(value);

    // Then update cache
    await this.set(key, value, ttl);
  }

  // Write-behind pattern
  async writeBehind<T>(
    key: string,
    value: T,
    persist: (value: T) => Promise<void>,
    ttl?: number
  ): Promise<void> {
    // Update cache immediately
    await this.set(key, value, ttl);

    // Queue write to persistent store
    setImmediate(async () => {
      try {
        await persist(value);
      } catch (error) {
        logger.error('Write-behind persist error:', error);
        // Implement retry logic or dead letter queue
      }
    });
  }

  // Refresh-ahead pattern
  async refreshAhead<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number,
    refreshThreshold = 0.8
  ): Promise<T | null> {
    const ttlKey = `${this.getKey(key)}:ttl`;
    
    // Get value and TTL
    const [value, remainingTTL] = await Promise.all([
      this.get<T>(key),
      this.client.ttl(this.getKey(key))
    ]);

    if (value === null) {
      // Cache miss - load and cache
      const newValue = await factory();
      await this.set(key, newValue, ttl);
      return newValue;
    }

    // Check if refresh needed
    if (remainingTTL > 0 && remainingTTL < ttl * refreshThreshold) {
      // Refresh in background
      setImmediate(async () => {
        try {
          const newValue = await factory();
          await this.set(key, newValue, ttl);
        } catch (error) {
          logger.error('Refresh-ahead error:', error);
        }
      });
    }

    return value;
  }

  // Distributed locking
  async acquireLock(
    resource: string,
    ttl = 10000
  ): Promise<string | null> {
    const lockKey = `lock:${resource}`;
    const lockValue = require('uuid').v4();

    const result = await this.client.set(
      lockKey,
      lockValue,
      'PX',
      ttl,
      'NX'
    );

    return result === 'OK' ? lockValue : null;
  }

  async releaseLock(
    resource: string,
    lockValue: string
  ): Promise<boolean> {
    const lockKey = `lock:${resource}`;
    
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.client.eval(
      script,
      1,
      lockKey,
      lockValue
    );

    return result === 1;
  }
}
```

### Month 11: Resilience Patterns

#### 4. Advanced Circuit Breaker
```typescript
// packages/shared-utilities/src/resilience/circuit-breaker.ts
import { EventEmitter } from 'events';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number;
  resetTimeout?: number;
  volumeThreshold?: number;
  errorFilter?: (error: Error) => boolean;
  fallback?: () => Promise<any>;
}

export class AdvancedCircuitBreaker extends EventEmitter {
  private state = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private requests = 0;
  private lastFailureTime?: Date;
  private nextAttempt?: Date;
  
  // Metrics
  private metrics = {
    totalRequests: 0,
    totalFailures: 0,
    totalSuccesses: 0,
    totalFallbacks: 0,
    consecutiveFailures: 0,
    consecutiveSuccesses: 0
  };

  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {}
  ) {
    super();
    this.options = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      resetTimeout: 30000,
      volumeThreshold: 10,
      ...options
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.metrics.totalRequests++;
    this.requests++;

    // Check if circuit should be open
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        return this.handleOpen();
      }
    }

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.options.timeout}ms`));
      }, this.options.timeout!);

      operation()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private onSuccess() {
    this.metrics.totalSuccesses++;
    this.metrics.consecutiveSuccesses++;
    this.metrics.consecutiveFailures = 0;
    this.failures = 0;
    this.successes++;

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successes >= this.options.successThreshold!) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  private onFailure(error: Error) {
    // Check if error should be counted
    if (this.options.errorFilter && !this.options.errorFilter(error)) {
      return;
    }

    this.metrics.totalFailures++;
    this.metrics.consecutiveFailures++;
    this.metrics.consecutiveSuccesses = 0;
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.shouldOpen()) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  private shouldOpen(): boolean {
    return this.requests >= this.options.volumeThreshold! &&
           this.failures >= this.options.failureThreshold!;
  }

  private shouldAttemptReset(): boolean {
    return this.nextAttempt && new Date() >= this.nextAttempt;
  }

  private async handleOpen<T>(): Promise<T> {
    this.metrics.totalFallbacks++;

    if (this.options.fallback) {
      return this.options.fallback();
    }

    throw new Error(`Circuit breaker '${this.name}' is OPEN`);
  }

  private transitionTo(newState: CircuitState) {
    const oldState = this.state;
    this.state = newState;

    // Reset counters
    this.requests = 0;
    this.failures = 0;
    this.successes = 0;

    // Set next attempt time for OPEN state
    if (newState === CircuitState.OPEN) {
      this.nextAttempt = new Date(Date.now() + this.options.resetTimeout!);
    }

    this.emit('stateChange', {
      name: this.name,
      from: oldState,
      to: newState,
      metrics: this.getMetrics()
    });

    logger.info(`Circuit breaker '${this.name}' transitioned from ${oldState} to ${newState}`);
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics() {
    return {
      ...this.metrics,
      state: this.state,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt
    };
  }

  reset() {
    this.transitionTo(CircuitState.CLOSED);
    this.metrics = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      totalFallbacks: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0
    };
  }
}

// Circuit breaker factory with shared state
export class CircuitBreakerFactory {
  private static breakers = new Map<string, AdvancedCircuitBreaker>();

  static create(
    name: string,
    options?: CircuitBreakerOptions
  ): AdvancedCircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new AdvancedCircuitBreaker(name, options);
      this.breakers.set(name, breaker);
    }

    return this.breakers.get(name)!;
  }

  static getAll(): Map<string, AdvancedCircuitBreaker> {
    return new Map(this.breakers);
  }

  static getMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    this.breakers.forEach((breaker, name) => {
      metrics[name] = breaker.getMetrics();
    });

    return metrics;
  }
}
```

### Month 12: Performance Optimization

#### 5. Connection Pooling & Resource Management
```typescript
// packages/shared-utilities/src/resources/connection-pool.ts
import { EventEmitter } from 'events';
import PQueue from 'p-queue';

export interface PoolOptions {
  min: number;
  max: number;
  idleTimeout?: number;
  acquireTimeout?: number;
  createRetries?: number;
  validateOnBorrow?: boolean;
}

export interface PooledResource<T> {
  resource: T;
  id: string;
  createdAt: Date;
  lastUsedAt: Date;
  useCount: number;
  isValid: boolean;
}

export abstract class ConnectionPool<T> extends EventEmitter {
  protected available: PooledResource<T>[] = [];
  protected inUse = new Map<string, PooledResource<T>>();
  protected pending: Array<{
    resolve: (resource: T) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  
  private createQueue: PQueue;
  private idleCheckInterval?: NodeJS.Timer;

  constructor(
    protected name: string,
    protected options: PoolOptions
  ) {
    super();
    
    this.createQueue = new PQueue({
      concurrency: 1
    });

    this.initialize();
  }

  protected abstract createResource(): Promise<T>;
  protected abstract destroyResource(resource: T): Promise<void>;
  protected abstract validateResource(resource: T): Promise<boolean>;

  private async initialize() {
    // Create minimum resources
    const promises = [];
    for (let i = 0; i < this.options.min; i++) {
      promises.push(this.createAndAddResource());
    }

    await Promise.all(promises);

    // Start idle check
    if (this.options.idleTimeout) {
      this.idleCheckInterval = setInterval(
        () => this.removeIdleResources(),
        this.options.idleTimeout / 2
      );
    }

    this.emit('initialized', {
      pool: this.name,
      size: this.available.length
    });
  }

  async acquire(): Promise<T> {
    // Try to get available resource
    let pooled = this.getAvailableResource();
    
    if (pooled) {
      // Validate if required
      if (this.options.validateOnBorrow) {
        const isValid = await this.validateResource(pooled.resource);
        if (!isValid) {
          await this.destroy(pooled);
          pooled = null;
        }
      }
    }

    // Create new resource if needed and possible
    if (!pooled && this.getTotalSize() < this.options.max) {
      pooled = await this.createAndAddResource();
    }

    // If still no resource, wait for one
    if (!pooled) {
      pooled = await this.waitForResource();
    }

    // Mark as in use
    pooled.lastUsedAt = new Date();
    pooled.useCount++;
    this.inUse.set(pooled.id, pooled);

    this.emit('acquire', {
      pool: this.name,
      resourceId: pooled.id,
      available: this.available.length,
      inUse: this.inUse.size
    });

    return pooled.resource;
  }

  async release(resource: T): Promise<void> {
    const pooled = this.findPooledResource(resource);
    if (!pooled) {
      throw new Error('Resource not from this pool');
    }

    // Remove from in-use
    this.inUse.delete(pooled.id);

    // Validate resource
    const isValid = await this.validateResource(resource);
    if (!isValid) {
      await this.destroy(pooled);
      return;
    }

    // Return to available pool
    pooled.lastUsedAt = new Date();
    this.available.push(pooled);

    // Process pending requests
    this.processPending();

    this.emit('release', {
      pool: this.name,
      resourceId: pooled.id,
      available: this.available.length,
      inUse: this.inUse.size
    });
  }

  private getAvailableResource(): PooledResource<T> | null {
    return this.available.shift() || null;
  }

  private async createAndAddResource(): Promise<PooledResource<T>> {
    const resource = await this.createQueue.add(async () => {
      let lastError: Error | null = null;
      
      for (let i = 0; i < (this.options.createRetries || 3); i++) {
        try {
          return await this.createResource();
        } catch (error) {
          lastError = error as Error;
          if (i < (this.options.createRetries || 3) - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          }
        }
      }
      
      throw lastError;
    });

    const pooled: PooledResource<T> = {
      resource: resource!,
      id: require('uuid').v4(),
      createdAt: new Date(),
      lastUsedAt: new Date(),
      useCount: 0,
      isValid: true
    };

    this.available.push(pooled);
    return pooled;
  }

  private waitForResource(): Promise<PooledResource<T>> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.pending.findIndex(p => p.timeout === timeout);
        if (index >= 0) {
          this.pending.splice(index, 1);
        }
        reject(new Error(`Resource acquisition timeout after ${this.options.acquireTimeout}ms`));
      }, this.options.acquireTimeout || 30000);

      this.pending.push({ resolve: resolve as any, reject, timeout });
    });
  }

  private processPending() {
    while (this.pending.length > 0 && this.available.length > 0) {
      const { resolve, timeout } = this.pending.shift()!;
      clearTimeout(timeout);
      
      const pooled = this.available.shift()!;
      resolve(pooled);
    }
  }

  private async destroy(pooled: PooledResource<T>) {
    try {
      await this.destroyResource(pooled.resource);
    } catch (error) {
      logger.error(`Failed to destroy resource in pool ${this.name}:`, error);
    }

    this.emit('destroy', {
      pool: this.name,
      resourceId: pooled.id,
      lifespan: Date.now() - pooled.createdAt.getTime(),
      useCount: pooled.useCount
    });
  }

  private async removeIdleResources() {
    const now = Date.now();
    const timeout = this.options.idleTimeout!;
    
    const toRemove = this.available.filter(pooled => 
      now - pooled.lastUsedAt.getTime() > timeout &&
      this.getTotalSize() > this.options.min
    );

    for (const pooled of toRemove) {
      const index = this.available.indexOf(pooled);
      if (index >= 0) {
        this.available.splice(index, 1);
        await this.destroy(pooled);
      }
    }
  }

  private findPooledResource(resource: T): PooledResource<T> | null {
    for (const pooled of this.inUse.values()) {
      if (pooled.resource === resource) {
        return pooled;
      }
    }
    return null;
  }

  private getTotalSize(): number {
    return this.available.length + this.inUse.size;
  }

  async drain(): Promise<void> {
    // Clear pending requests
    for (const { reject, timeout } of this.pending) {
      clearTimeout(timeout);
      reject(new Error('Pool is draining'));
    }
    this.pending = [];

    // Stop idle check
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
    }

    // Destroy all resources
    const allResources = [...this.available, ...this.inUse.values()];
    
    await Promise.all(
      allResources.map(pooled => this.destroy(pooled))
    );

    this.available = [];
    this.inUse.clear();

    this.emit('drained', { pool: this.name });
  }

  getStats() {
    return {
      name: this.name,
      available: this.available.length,
      inUse: this.inUse.size,
      pending: this.pending.length,
      total: this.getTotalSize(),
      min: this.options.min,
      max: this.options.max
    };
  }
}
```

---

## 📊 Phase 4 Success Metrics

### Architecture Improvements
- ✅ Database per service pattern implemented
- ✅ Event-driven architecture established
- ✅ Service mesh for advanced traffic management
- ✅ CQRS and Event Sourcing patterns
- ✅ Distributed caching and resilience patterns

### Scalability Achievements
- **Service Autonomy**: 100% independent deployments
- **Event Processing**: <10ms average latency
- **Cache Hit Rate**: >90% for read operations
- **Circuit Breaker**: 99.9% uptime with failures
- **Resource Utilization**: 40% reduction in database load

### Performance Metrics
- **API Response Time**: <50ms p99
- **Event Bus Throughput**: 100K events/second
- **Database Query Time**: <10ms average
- **Cache Response Time**: <2ms
- **Service Discovery**: <5ms lookup time

---

## 🎯 Final Platform State

### Technical Excellence
1. **Microservices**: True service independence
2. **Event-Driven**: Loosely coupled, scalable
3. **Resilient**: Self-healing, fault-tolerant
4. **Observable**: Full system visibility
5. **Performant**: Sub-second response times

### Business Value
1. **Scalability**: Ready for millions of users
2. **Reliability**: 99.99% uptime achievable
3. **Maintainability**: Independent team ownership
4. **Flexibility**: Easy to add new features
5. **Cost-Effective**: Efficient resource usage

### Next Steps
- Container orchestration with Kubernetes
- Multi-region deployment
- Advanced ML/AI integration
- Real-time analytics
- Mobile app development

The Yggdrasil platform is now a world-class educational system ready for global scale and continuous innovation.