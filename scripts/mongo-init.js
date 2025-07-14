// MongoDB initialization script for development
// This script runs when the MongoDB container starts for the first time

print('🌱 Initializing Yggdrasil development database...');

// Switch to yggdrasil-dev database
db = db.getSiblingDB('yggdrasil-dev');

// Create initial collections if needed
db.createCollection('users');
db.createCollection('sessions');

// Add any indexes that might be useful
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });
db.sessions.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 });

print('✅ Yggdrasil development database initialized successfully!');