// packages/database-schemas/src/connection/multi-db.ts
import mongoose, { Connection, ConnectOptions } from 'mongoose';
import { config } from '@yggdrasil/shared-utilities';
import { logger } from '@yggdrasil/shared-utilities';

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
    options?: ConnectOptions,
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
      dbName,
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
      'auth-service': (config as any).AUTH_DB_URI || config.MONGODB_URI,
      'user-service': (config as any).USER_DB_URI || config.MONGODB_URI,
      'course-service': (config as any).COURSE_DB_URI || config.MONGODB_URI,
      'enrollment-service': (config as any).ENROLLMENT_DB_URI || config.MONGODB_URI,
      'news-service': (config as any).NEWS_DB_URI || config.MONGODB_URI,
      'planning-service': (config as any).PLANNING_DB_URI || config.MONGODB_URI,
      'statistics-service': (config as any).STATS_DB_URI || config.MONGODB_URI,
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
    serviceName: string,
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
      service => this.disconnect(service),
    );
    await Promise.all(promises);
  }

  getConnection(serviceName: string): Connection | undefined {
    return this.connections.get(serviceName);
  }
}

// Singleton instance
export const dbManager = new DatabaseManager();
