// packages/database-schemas/src/index.ts
// Main export file for database schemas

// Database connection
export * from './connection/database';

// Phase 4.1: Multi-database connection manager
export { DatabaseManager, dbManager } from './connection/multi-db';

// Models
export * from './models/User';
export * from './models/NewsArticle';
export * from './models/Course';
export * from './models/Event';
export * from './models/Promotion';
export * from './models/EventAttendance';
export * from './models/PromotionProgress';

// Phase 4.1: Service-specific models
export * from './models/AuthUser';
export * from './models/UserProfile';

// Migrations
export { Migration, MigrationRunner, runMigrationCLI } from './migrations/migration-runner';
export { default as SplitDatabases } from './migrations/split-databases';
