// packages/shared-utilities/src/patterns/data-sync.ts
export enum SyncStrategy {
  EVENTUAL_CONSISTENCY = 'eventual',
  STRONG_CONSISTENCY = 'strong',
  CACHED = 'cached',
  REQUEST_RESPONSE = 'request_response',
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
      maxBackoffMs: 30000,
    },
  },
  {
    source: 'user-service',
    target: 'course-service',
    strategy: SyncStrategy.CACHED,
    fields: ['firstName', 'lastName', 'photo', 'department'],
    ttl: 3600000, // 1 hour
  },
  {
    source: 'course-service',
    target: 'statistics-service',
    strategy: SyncStrategy.EVENTUAL_CONSISTENCY,
    fields: ['*'], // All fields for analytics
  },
];
