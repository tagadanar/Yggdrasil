#!/bin/bash

echo "Setting up MongoDB for Yggdrasil development..."

# Try to create MongoDB user for development
mongod --version > /dev/null 2>&1 || {
    echo "MongoDB not found. Please install MongoDB first."
    exit 1
}

# Create admin user (if not exists) and development database user
mongo --eval "
db = db.getSiblingDB('admin');
try {
    db.createUser({
        user: 'ygg-admin',
        pwd: 'dev-password-123',
        roles: [ { role: 'root', db: 'admin' } ]
    });
    print('✅ Admin user created');
} catch (e) {
    if (e.code === 11000) {
        print('ℹ️  Admin user already exists');
    } else {
        print('❌ Error creating admin user: ' + e);
    }
}

db = db.getSiblingDB('yggdrasil-dev');
try {
    db.createUser({
        user: 'ygg-dev',
        pwd: 'dev-password-123',
        roles: [ { role: 'readWrite', db: 'yggdrasil-dev' } ]
    });
    print('✅ Development user created');
} catch (e) {
    if (e.code === 11000) {
        print('ℹ️  Development user already exists');
    } else {
        print('❌ Error creating development user: ' + e);
    }
}
" 2>/dev/null || echo "❌ Failed to connect to MongoDB for user creation"

echo "✅ MongoDB setup complete!"
echo "Updated connection string: mongodb://ygg-dev:dev-password-123@localhost:27017/yggdrasil-dev"