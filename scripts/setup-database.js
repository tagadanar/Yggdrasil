// Path: scripts/setup-database.js
const { MongoClient } = require('mongodb');

async function setupDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB_NAME || '101-school-dev';
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // Create collections and indexes
    const collections = ['users', 'courses', 'schedules', 'news', 'auditLogs'];
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      console.log(`Created collection: ${collectionName}`);
    }
    
    // Create indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    
    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

setupDatabase();