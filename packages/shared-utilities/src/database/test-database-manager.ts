// packages/shared-utilities/src/database/test-database-manager.ts
// Centralized database connection manager for tests with guaranteed authentication

import { config } from '../config/env-validator';
import { connectDatabase } from '@yggdrasil/database-schemas';
import { LoggerFactory } from '../logging/logger';

const logger = LoggerFactory.createLogger('test-db-manager');

/**
 * Centralized database connection manager specifically for tests.
 * 
 * Ensures all test database connections use proper authentication
 * and provides a single source of truth for test database URIs.
 * 
 * Features:
 * - Always uses authenticated MongoDB connections
 * - Handles environment variable loading
 * - Provides fallback for missing credentials
 * - Centralized logging and error handling
 */
export class TestDatabaseManager {
  private static instance: TestDatabaseManager;
  private authenticatedUri: string | null = null;

  /**
   * Get singleton instance
   */
  static getInstance(): TestDatabaseManager {
    if (!TestDatabaseManager.instance) {
      TestDatabaseManager.instance = new TestDatabaseManager();
    }
    return TestDatabaseManager.instance;
  }

  /**
   * Build authenticated MongoDB connection string for tests.
   * 
   * Creates a properly formatted connection string with authentication
   * credentials from environment variables.
   * 
   * @returns Authenticated MongoDB connection string
   * @throws Error if required environment variables are missing
   */
  buildAuthenticatedConnectionString(): string {
    if (this.authenticatedUri) {
      return this.authenticatedUri;
    }

    try {
      // Get base URI from config
      let baseUri = config.MONGODB_URI;
      
      // Check if the baseUri already contains authentication credentials
      if (baseUri.includes('@')) {
        logger.debug('✅ Using pre-authenticated MongoDB connection');
        this.authenticatedUri = baseUri;
        return baseUri;
      }
      
      // Extract MongoDB credentials from environment for non-test environments
      const username = config.MONGO_APP_USERNAME;
      const password = config.MONGO_APP_PASSWORD;
      const database = config.MONGO_DATABASE || 'yggdrasil-dev';

      if (!username || !password) {
        logger.warn('⚠️ MongoDB credentials not found in environment, using unauthenticated connection');
        logger.warn('   This may cause authentication failures in production');
        return baseUri;
      }

      // Parse the base URI to extract components
      const url = new URL(baseUri);
      
      // Build authenticated URI for production environments
      const authenticatedUri = `mongodb://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${url.host}/${database}?authSource=${database}`;
      
      logger.debug('✅ Built authenticated MongoDB connection string');
      logger.debug(`   Host: ${url.host}`);
      logger.debug(`   Database: ${database}`);
      logger.debug(`   Username: ${username}`);
      
      this.authenticatedUri = authenticatedUri;
      return authenticatedUri;

    } catch (error) {
      logger.error('❌ Failed to build authenticated connection string:', error);
      throw new Error(`Failed to build authenticated MongoDB connection: ${error}`);
    }
  }

  /**
   * Connect to the test database with authentication.
   * 
   * Ensures the database connection uses proper authentication
   * credentials for test environments.
   * 
   * @returns Promise that resolves when connected
   * @throws Error if connection fails
   */
  async connectToTestDatabase(): Promise<void> {
    try {
      const authenticatedUri = this.buildAuthenticatedConnectionString();
      
      logger.debug('🚀 Connecting to test database with authentication...');
      await connectDatabase(authenticatedUri);
      logger.debug('✅ Connected to test database successfully');

    } catch (error) {
      logger.error('❌ Failed to connect to test database:', error);
      throw new Error(`Test database connection failed: ${error}`);
    }
  }

  /**
   * Get the authenticated connection string for use in other components.
   * 
   * @returns The authenticated MongoDB connection string
   */
  getAuthenticatedConnectionString(): string {
    return this.buildAuthenticatedConnectionString();
  }

  /**
   * Reset cached connection string (for testing purposes)
   */
  reset(): void {
    this.authenticatedUri = null;
  }

  /**
   * Validate that authentication credentials are available
   * 
   * @returns true if credentials are available, false otherwise
   */
  hasAuthenticationCredentials(): boolean {
    try {
      const username = config.MONGO_APP_USERNAME;
      const password = config.MONGO_APP_PASSWORD;
      return !!(username && password);
    } catch {
      return false;
    }
  }
}

// Export singleton instance for convenience
export const testDatabaseManager = TestDatabaseManager.getInstance();

/**
 * Convenience function to get authenticated connection string for tests
 */
export function getTestDatabaseConnectionString(): string {
  return testDatabaseManager.getAuthenticatedConnectionString();
}

/**
 * Convenience function to connect to test database with authentication
 */
export async function connectToTestDatabase(): Promise<void> {
  return testDatabaseManager.connectToTestDatabase();
}