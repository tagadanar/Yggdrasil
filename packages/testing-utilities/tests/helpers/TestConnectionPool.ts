// Local copy of TestConnectionPool to bypass build issues temporarily
// This is a direct copy from shared-utilities/src/testing/TestConnectionPool.ts

import mongoose from 'mongoose';
import { getTestDatabaseConnectionString } from '@yggdrasil/shared-utilities';
import { LoggerFactory } from '@yggdrasil/shared-utilities';

const logger = LoggerFactory.createLogger('test-connection-pool');

/**
 * TestConnectionPool - Manages database connections for tests
 */
export class TestConnectionPool {
  private static sharedConnection: mongoose.Connection | null = null;
  private static connectionCount = 0;
  private static isConnecting = false;
  private static connectionPromise: Promise<mongoose.Connection> | null = null;
  
  static async getConnection(): Promise<mongoose.Connection> {
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }
    
    if (this.sharedConnection && this.sharedConnection.readyState === 1) {
      this.connectionCount++;
      logger.debug(`Connection reused (count: ${this.connectionCount})`);
      return this.sharedConnection;
    }
    
    this.connectionPromise = this.createSharedConnection();
    const connection = await this.connectionPromise;
    this.connectionPromise = null;
    
    return connection;
  }
  
  private static async createSharedConnection(): Promise<mongoose.Connection> {
    this.isConnecting = true;
    
    try {
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
      
      this.sharedConnection = await mongoose.createConnection(uri, {
        maxPoolSize: 15,
        minPoolSize: 2,
        maxIdleTimeMS: 5000,
        serverSelectionTimeoutMS: 3000,
        socketTimeoutMS: 30000,
        bufferCommands: false,
        connectTimeoutMS: 10000,
        family: 4,
      });
      
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
  
  static async releaseConnection(): Promise<void> {
    this.connectionCount = Math.max(0, this.connectionCount - 1);
    logger.debug(`Connection released (count: ${this.connectionCount})`);
    
    if (this.connectionCount === 0) {
      setTimeout(() => {
        if (this.connectionCount === 0) {
          this.cleanup().catch(error => {
            logger.error('Error during delayed cleanup:', error);
          });
        }
      }, 2000);
    }
  }
  
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
  
  static async checkHealth(): Promise<boolean> {
    if (!this.sharedConnection || this.sharedConnection.readyState !== 1) {
      return false;
    }
    
    try {
      await this.sharedConnection!.db.admin().ping();
      return true;
    } catch (error) {
      logger.error('Connection health check failed:', error);
      return false;
    }
  }
}