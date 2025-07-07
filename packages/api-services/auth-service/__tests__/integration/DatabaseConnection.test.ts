import { DatabaseConnection } from '../../../../database-schemas/src';

describe('Database Connection', () => {
  afterEach(async () => {
    await DatabaseConnection.disconnect();
  });

  it('should connect to MongoDB with correct credentials', async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:dev_password_2024@localhost:27017/yggdrasil-dev?authSource=admin';
    
    const result = await DatabaseConnection.connect(mongoUri);
    expect(result).toBe(true);
    expect(DatabaseConnection.isConnected()).toBe(true);
    expect(DatabaseConnection.getConnectionState()).toBe('connected');
  });

  it('should handle connection errors gracefully', async () => {
    const invalidUri = 'mongodb://invalid:credentials@localhost:27017/yggdrasil-dev?authSource=admin';
    
    await expect(DatabaseConnection.connect(invalidUri)).rejects.toThrow();
  });

  it('should disconnect properly', async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:dev_password_2024@localhost:27017/yggdrasil-dev?authSource=admin';
    
    await DatabaseConnection.connect(mongoUri);
    await DatabaseConnection.disconnect();
    
    expect(DatabaseConnection.isConnected()).toBe(false);
    expect(DatabaseConnection.getConnectionState()).toBe('disconnected');
  });

  it('should perform health check correctly', async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:dev_password_2024@localhost:27017/yggdrasil-dev?authSource=admin';
    
    await DatabaseConnection.connect(mongoUri);
    
    const healthCheck = await DatabaseConnection.healthCheck();
    expect(healthCheck.status).toBe('healthy');
    expect(healthCheck.details.state).toBe('connected');
    expect(healthCheck.details.host).toBeDefined();
    expect(healthCheck.details.name).toBeDefined();
  });
});