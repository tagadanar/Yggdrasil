"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = exports.DatabaseConnection = void 0;
// Path: packages/database-schemas/src/connection/database.ts
const mongoose_1 = __importDefault(require("mongoose"));
class DatabaseConnection {
    /**
     * Connect to MongoDB database
     */
    static async connect(uri) {
        try {
            // Return true if already connected
            if (mongoose_1.default.connection.readyState === 1) {
                return true;
            }
            await mongoose_1.default.connect(uri, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            this.setupEventListeners();
            this.isInitialized = true;
            console.log('✅ Database connected successfully');
            return true;
        }
        catch (error) {
            console.error('❌ Database connection failed:', error);
            throw new Error(`Database connection failed: ${error}`);
        }
    }
    /**
     * Disconnect from MongoDB database
     */
    static async disconnect() {
        try {
            if (mongoose_1.default.connection.readyState !== 0) {
                await mongoose_1.default.disconnect();
                console.log('🔌 Database disconnected');
            }
            this.isInitialized = false;
        }
        catch (error) {
            console.error('❌ Database disconnection failed:', error);
            throw new Error(`Database disconnection failed: ${error}`);
        }
    }
    /**
     * Check if database is connected
     */
    static isConnected() {
        return mongoose_1.default.connection.readyState === 1;
    }
    /**
     * Get current connection state as string
     */
    static getConnectionState() {
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting',
        };
        return states[mongoose_1.default.connection.readyState] || 'unknown';
    }
    /**
     * Create database indexes
     */
    static async createIndexes() {
        if (!this.isConnected()) {
            throw new Error('Database not connected');
        }
        try {
            const db = mongoose_1.default.connection.db;
            if (!db) {
                throw new Error('Database connection not established');
            }
            // Indexes are created by the mongo-init.js script
            // to avoid duplicate index creation conflicts
            console.log('📋 Database connection established (indexes handled by init script)');
        }
        catch (error) {
            console.error('❌ Failed to create indexes:', error);
            throw new Error(`Failed to create indexes: ${error}`);
        }
    }
    /**
     * Setup event listeners for connection monitoring
     */
    static setupEventListeners() {
        if (this.isInitialized) {
            return;
        }
        mongoose_1.default.connection.on('connected', () => {
            console.log('🔗 Mongoose connected to MongoDB');
        });
        mongoose_1.default.connection.on('error', (error) => {
            console.error('❌ Mongoose connection error:', error);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.log('🔌 Mongoose disconnected');
        });
        // Handle application termination
        process.on('SIGINT', async () => {
            await this.disconnect();
            process.exit(0);
        });
    }
    /**
     * Health check for database connection
     */
    static async healthCheck() {
        const state = this.getConnectionState();
        if (!this.isConnected()) {
            return {
                status: 'unhealthy',
                details: { state }
            };
        }
        try {
            const db = mongoose_1.default.connection.db;
            if (!db) {
                throw new Error('Database connection not established');
            }
            const collections = await db.listCollections().toArray();
            return {
                status: 'healthy',
                details: {
                    state,
                    host: mongoose_1.default.connection.host,
                    name: mongoose_1.default.connection.name,
                    collections: collections.length,
                }
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                details: { state }
            };
        }
    }
}
exports.DatabaseConnection = DatabaseConnection;
DatabaseConnection.isInitialized = false;
// Export alias for compatibility
exports.Database = DatabaseConnection;
//# sourceMappingURL=database.js.map