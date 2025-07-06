#!/bin/bash

# MongoDB Health Check Script for Yggdrasil Development Environment
# This script ensures MongoDB is running and accessible before starting services

set -e

MONGO_HOST=${MONGO_HOST:-"localhost"}
MONGO_PORT=${MONGO_PORT:-"27017"}
MONGO_USER=${MONGO_USER:-"admin"}
MONGO_PASSWORD=${MONGO_PASSWORD:-"dev_password_2024"}
MONGO_DATABASE=${MONGO_DATABASE:-"yggdrasil-dev"}
MAX_RETRIES=${MAX_RETRIES:-30}
RETRY_INTERVAL=${RETRY_INTERVAL:-2}

echo "🔍 Checking MongoDB connection..."
echo "Host: $MONGO_HOST:$MONGO_PORT"
echo "Database: $MONGO_DATABASE"

# Function to check if MongoDB is accessible
check_mongodb() {
    mongosh --host "$MONGO_HOST:$MONGO_PORT" \
           --username "$MONGO_USER" \
           --password "$MONGO_PASSWORD" \
           --authenticationDatabase admin \
           --eval "db.adminCommand('ping')" \
           --quiet > /dev/null 2>&1
}

# Function to check if our database exists
check_database() {
    mongosh --host "$MONGO_HOST:$MONGO_PORT" \
           --username "$MONGO_USER" \
           --password "$MONGO_PASSWORD" \
           --authenticationDatabase admin \
           --eval "use $MONGO_DATABASE; db.runCommand({ping: 1})" \
           --quiet > /dev/null 2>&1
}

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB to be ready..."
retry_count=0

while [ $retry_count -lt $MAX_RETRIES ]; do
    if check_mongodb; then
        echo "✅ MongoDB is accessible"
        break
    fi
    
    retry_count=$((retry_count + 1))
    echo "🔄 Attempt $retry_count/$MAX_RETRIES failed, retrying in $RETRY_INTERVAL seconds..."
    sleep $RETRY_INTERVAL
done

if [ $retry_count -eq $MAX_RETRIES ]; then
    echo "❌ MongoDB connection failed after $MAX_RETRIES attempts"
    echo "🚀 Starting MongoDB with Docker Compose..."
    
    # Try to start MongoDB using Docker Compose
    if [ -f "docker-compose.dev.yml" ]; then
        docker-compose -f docker-compose.dev.yml up -d mongodb
        echo "⏳ Waiting for MongoDB to start..."
        sleep 10
        
        # Retry connection after starting
        retry_count=0
        while [ $retry_count -lt $MAX_RETRIES ]; do
            if check_mongodb; then
                echo "✅ MongoDB started successfully"
                break
            fi
            
            retry_count=$((retry_count + 1))
            echo "🔄 Startup attempt $retry_count/$MAX_RETRIES, retrying in $RETRY_INTERVAL seconds..."
            sleep $RETRY_INTERVAL
        done
        
        if [ $retry_count -eq $MAX_RETRIES ]; then
            echo "❌ Failed to start MongoDB"
            exit 1
        fi
    else
        echo "❌ docker-compose.dev.yml not found"
        echo "💡 Please ensure MongoDB is running or run: docker-compose -f docker-compose.dev.yml up -d mongodb"
        exit 1
    fi
fi

# Check if our application database exists and is accessible
echo "🔍 Checking application database..."
if check_database; then
    echo "✅ Database '$MONGO_DATABASE' is accessible"
else
    echo "⚠️  Database '$MONGO_DATABASE' not found, but MongoDB is running"
    echo "💡 The database will be created automatically on first connection"
fi

# Display MongoDB status
echo ""
echo "📊 MongoDB Status:"
mongosh --host "$MONGO_HOST:$MONGO_PORT" \
       --username "$MONGO_USER" \
       --password "$MONGO_PASSWORD" \
       --authenticationDatabase admin \
       --eval "
         print('Server Version: ' + db.version());
         print('Connection State: Connected');
         print('Available Databases:');
         db.adminCommand('listDatabases').databases.forEach(function(db) {
           print('  - ' + db.name + ' (' + (db.sizeOnDisk / 1024 / 1024).toFixed(2) + ' MB)');
         });
       " --quiet

echo ""
echo "🎉 MongoDB health check completed successfully!"
echo "🚀 Services can now start safely"