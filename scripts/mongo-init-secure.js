// scripts/mongo-init-secure.js
// MongoDB initialization script to create secure users and indexes
// This runs when MongoDB container starts for the first time

// Switch to admin database
db = db.getSiblingDB('admin');

// Create root admin user (from environment variables)
if (process.env.MONGO_INITDB_ROOT_USERNAME && process.env.MONGO_INITDB_ROOT_PASSWORD) {
  try {
    db.createUser({
      user: process.env.MONGO_INITDB_ROOT_USERNAME,
      pwd: process.env.MONGO_INITDB_ROOT_PASSWORD,
      roles: [
        { role: 'root', db: 'admin' }
      ]
    });
    print('✅ Root admin user created successfully');
  } catch (error) {
    if (error.code === 11000) {
      print('ℹ️ Root admin user already exists');
    } else {
      print('❌ Error creating root admin user:', error);
      throw error;
    }
  }
}

// Switch to application database
const dbName = process.env.MONGO_INITDB_DATABASE || 'yggdrasil-dev';
db = db.getSiblingDB(dbName);

// Create application user with limited permissions
if (process.env.MONGO_APP_USERNAME && process.env.MONGO_APP_PASSWORD) {
  try {
    db.createUser({
      user: process.env.MONGO_APP_USERNAME,
      pwd: process.env.MONGO_APP_PASSWORD,
      roles: [
        { role: 'readWrite', db: dbName },
        { role: 'dbAdmin', db: dbName }
      ]
    });
    print('✅ Application user created successfully');
  } catch (error) {
    if (error.code === 11000) {
      print('ℹ️ Application user already exists');
    } else {
      print('❌ Error creating application user:', error);
    }
  }
}

// Create read-only user for reporting
if (process.env.MONGO_READONLY_USERNAME && process.env.MONGO_READONLY_PASSWORD) {
  try {
    db.createUser({
      user: process.env.MONGO_READONLY_USERNAME,
      pwd: process.env.MONGO_READONLY_PASSWORD,
      roles: [
        { role: 'read', db: dbName }
      ]
    });
    print('✅ Read-only user created successfully');
  } catch (error) {
    if (error.code === 11000) {
      print('ℹ️ Read-only user already exists');
    } else {
      print('❌ Error creating read-only user:', error);
    }
  }
}

print('✅ MongoDB security configuration completed');