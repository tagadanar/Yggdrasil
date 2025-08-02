// packages/shared-utilities/src/testing/TestConnectionPool.ts
// Connection pool manager for test environments to prevent connection exhaustion

import mongoose from 'mongoose';
import { getTestDatabaseConnectionString } from '../database/test-database-manager';
import { LoggerFactory } from '../logging/logger';

const logger = LoggerFactory.createLogger('test-connection-pool');

/**
 * TestConnectionPool - Manages database connections for tests
 * 
 * Prevents connection exhaustion by reusing a shared connection pool
 * across all tests instead of creating new connections for each test.
 * 
 * Features:
 * - Single shared connection for all tests
 * - Reference counting for safe cleanup
 * - Automatic reconnection on failure
 * - Connection health monitoring
 */
export class TestConnectionPool {
  private static sharedConnection: mongoose.Connection | null = null;
  private static connectionCount = 0;
  private static isConnecting = false;
  private static connectionPromise: Promise<mongoose.Connection> | null = null;
  
  /**
   * Get or create a shared database connection
   * 
   * @returns Promise resolving to a mongoose connection
   */
  static async getConnection(): Promise<mongoose.Connection> {
    // If already connecting, wait for that operation
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }
    
    // If connection exists and is healthy, return it
    if (this.sharedConnection && this.sharedConnection.readyState === 1) {
      this.connectionCount++;
      logger.debug(`Connection reused (count: ${this.connectionCount})`);
      return this.sharedConnection;
    }
    
    // Create new connection
    this.connectionPromise = this.createSharedConnection();
    const connection = await this.connectionPromise;
    this.connectionPromise = null;
    
    return connection;
  }
  
  /**
   * Create a new shared connection with optimized settings
   */
  private static async createSharedConnection(): Promise<mongoose.Connection> {
    this.isConnecting = true;
    
    try {
      // Close existing connection if any
      if (this.sharedConnection) {
        logger.debug('Closing existing connection before creating new one');
        try {
          await this.sharedConnection.close();
        } catch (error) {
          logger.warn('Error closing existing connection:', error);
        }
        this.sharedConnection = null;
      }
      
      const uri = getTestDatabaseConnectionString();
      logger.debug('Creating new shared connection to test database');
      
      // Create connection with optimized pool settings
      this.sharedConnection = await mongoose.createConnection(uri, {
        maxPoolSize: 15,
        minPoolSize: 2,
        maxIdleTimeMS: 5000,
        serverSelectionTimeoutMS: 3000,
        socketTimeoutMS: 30000,
        bufferCommands: false,
        connectTimeoutMS: 10000,
        family: 4, // Force IPv4
      });
      
      // Setup connection event handlers
      this.setupEventHandlers();
      
      this.connectionCount = 1;
      logger.info('✅ Shared test connection established');
      
      return this.sharedConnection;
      
    } catch (error) {
      logger.error('❌ Failed to create shared connection:', error);
      this.sharedConnection = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }
  
  /**
   * Setup event handlers for connection monitoring
   */
  private static setupEventHandlers(): void {
    if (!this.sharedConnection) return;
    
    this.sharedConnection.on('error', (error) => {
      logger.error('Connection error:', error);
    });
    
    this.sharedConnection.on('disconnected', () => {
      logger.warn('Connection disconnected');
    });
    
    this.sharedConnection.on('reconnected', () => {
      logger.info('Connection reconnected');
    });
  }
  
  /**
   * Release a connection reference and cleanup if no longer needed
   */
  static async releaseConnection(): Promise<void> {
    this.connectionCount = Math.max(0, this.connectionCount - 1);
    logger.debug(`Connection released (count: ${this.connectionCount})`);
    
    // Don't immediately close - wait a bit in case another test needs it
    if (this.connectionCount === 0) {
      setTimeout(() => {
        if (this.connectionCount === 0) {
          this.cleanup().catch(error => {
            logger.error('Error during delayed cleanup:', error);
          });
        }
      }, 2000); // 2 second delay
    }
  }
  
  /**
   * Force cleanup of the shared connection
   */
  static async cleanup(): Promise<void> {
    logger.debug('Cleaning up test connection pool');
    
    this.connectionCount = 0;
    
    if (this.sharedConnection) {
      try {
        await this.sharedConnection.close();
        logger.info('✅ Shared connection closed');
      } catch (error) {
        logger.error('Error closing shared connection:', error);
      }
      
      this.sharedConnection = null;
    }
  }
  
  /**
   * Get current connection statistics
   */
  static getStats(): {
    isConnected: boolean;
    connectionCount: number;
    readyState: number;
  } {
    return {
      isConnected: this.sharedConnection?.readyState === 1,
      connectionCount: this.connectionCount,
      readyState: this.sharedConnection?.readyState || 0,
    };
  }
  
  /**
   * Check if connection is healthy
   */
  static async checkHealth(): Promise<boolean> {
    if (!this.sharedConnection || this.sharedConnection.readyState !== 1) {
      return false;
    }
    
    try {
      // Simple ping to check connection
      await this.sharedConnection.db!.admin().ping();
      return true;
    } catch (error) {
      logger.error('Connection health check failed:', error);
      return false;
    }
  }
}

/**
 * Export a modified TestInitializer that uses the connection pool
 */
export async function initializeWithConnectionPool(): Promise<void> {
  const connection = await TestConnectionPool.getConnection();
  
  // Set the default mongoose connection to our pooled connection
  if (mongoose.connection !== connection) {
    // This ensures all models use our pooled connection
    Object.assign(mongoose.connection, connection);
  }
}