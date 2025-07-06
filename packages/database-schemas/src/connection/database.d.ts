export declare class DatabaseConnection {
    private static isInitialized;
    /**
     * Connect to MongoDB database
     */
    static connect(uri: string): Promise<boolean>;
    /**
     * Disconnect from MongoDB database
     */
    static disconnect(): Promise<void>;
    /**
     * Check if database is connected
     */
    static isConnected(): boolean;
    /**
     * Get current connection state as string
     */
    static getConnectionState(): string;
    /**
     * Create database indexes
     */
    static createIndexes(): Promise<void>;
    /**
     * Setup event listeners for connection monitoring
     */
    private static setupEventListeners;
    /**
     * Health check for database connection
     */
    static healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        details: {
            state: string;
            host?: string;
            name?: string;
            collections?: number;
        };
    }>;
}
export declare const Database: typeof DatabaseConnection;
//# sourceMappingURL=database.d.ts.map