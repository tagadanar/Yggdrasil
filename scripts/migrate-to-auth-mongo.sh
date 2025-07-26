#!/bin/bash
# scripts/migrate-to-auth-mongo.sh
# Migration script to transition from non-authenticated MongoDB to secure authenticated setup

echo "🔐 MongoDB Authentication Migration"
echo "=================================="
echo ""
echo "⚠️  WARNING: This will restart your MongoDB with authentication enabled."
echo "Make sure you have backed up your data!"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 1
fi

# Step 1: Stop current services
echo "📦 Stopping current services..."
docker-compose down
npm run dev:stop 2>/dev/null || true

# Step 2: Backup current data
echo "💾 Backing up current data..."
mkdir -p backup
docker run --rm \
  -v yggdrasil_mongodb_data:/data/db \
  -v $(pwd)/backup:/backup \
  mongo:7.0 \
  bash -c "cd /data/db && tar czf /backup/mongodb-backup-$(date +%Y%m%d-%H%M%S).tar.gz ."

if [ $? -eq 0 ]; then
    echo "✅ Backup completed successfully"
else
    echo "❌ Backup failed - aborting migration"
    exit 1
fi

# Step 3: Check if .env already has MongoDB credentials
if grep -q "MONGO_ROOT_PASSWORD" .env 2>/dev/null; then
    echo "ℹ️ MongoDB credentials already exist in .env"
else
    echo "🔑 Generating secure passwords..."
    
    # Generate secure passwords
    MONGO_ROOT_PASSWORD=$(openssl rand -base64 32 | tr -d '=' | tr -d '\n')
    MONGO_APP_PASSWORD=$(openssl rand -base64 32 | tr -d '=' | tr -d '\n')
    MONGO_READONLY_PASSWORD=$(openssl rand -base64 32 | tr -d '=' | tr -d '\n')

    # Add to .env file
    cat >> .env << EOF

# MongoDB Authentication (generated $(date))
MONGO_ROOT_USERNAME=root
MONGO_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
MONGO_APP_USERNAME=yggdrasil_app
MONGO_APP_PASSWORD=${MONGO_APP_PASSWORD}
MONGO_READONLY_USERNAME=yggdrasil_readonly
MONGO_READONLY_PASSWORD=${MONGO_READONLY_PASSWORD}
MONGO_DATABASE=yggdrasil-dev
EOF

    echo "✅ Passwords generated and saved to .env file"
fi

# Step 4: Start MongoDB with auth
echo "🚀 Starting MongoDB with authentication..."
docker-compose up -d mongodb

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB to initialize..."
echo "    This may take up to 60 seconds for first-time user creation..."

# Wait with better feedback
for i in {1..12}; do
    echo "    Checking MongoDB status... (attempt $i/12)"
    sleep 5
    
    if docker exec yggdrasil-mongodb mongosh --eval "db.adminCommand('ping')" --quiet >/dev/null 2>&1; then
        echo "✅ MongoDB is responding"
        break
    fi
    
    if [ $i -eq 12 ]; then
        echo "❌ MongoDB failed to start properly"
        echo "Check docker logs: docker-compose logs mongodb"
        exit 1
    fi
done

# Step 5: Test authenticated connection
echo "🧪 Testing authenticated connection..."

# Load credentials from .env
source .env

# Test connection with app user
docker exec yggdrasil-mongodb mongosh \
  "mongodb://${MONGO_APP_USERNAME}:${MONGO_APP_PASSWORD}@localhost:27017/${MONGO_DATABASE}" \
  --eval "db.runCommand({ ping: 1 })" --quiet

if [ $? -eq 0 ]; then
    echo "✅ MongoDB authentication configured successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Start all services: npm run dev"
    echo "2. Run tests to verify everything works: npm run test:quiet"
    echo "3. Check that authentication flow works properly"
    echo ""
    echo "💾 Database backup location: backup/mongodb-backup-$(date +%Y%m%d)*.tar.gz"
else
    echo "❌ Failed to authenticate with MongoDB"
    echo ""
    echo "🔍 Troubleshooting steps:"
    echo "1. Check MongoDB logs: docker-compose logs mongodb"
    echo "2. Verify .env file has correct credentials"
    echo "3. Try restarting MongoDB: docker-compose restart mongodb"
    echo ""
    echo "📞 If issues persist, restore backup and check configuration"
    exit 1
fi