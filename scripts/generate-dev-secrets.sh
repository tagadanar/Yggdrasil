#!/bin/bash
# scripts/generate-dev-secrets.sh
# Generate secure development secrets for Yggdrasil platform

echo "🔐 Generating secure development secrets..."

# Generate random 32-character secrets
JWT_SECRET=$(openssl rand -base64 32 | tr -d '=' | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 32 | tr -d '=' | tr -d '\n')

# Create .env file
cat > .env.development << EOF
# Auto-generated development secrets - DO NOT USE IN PRODUCTION
# Generated on: $(date)

NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27018/yggdrasil-dev

# JWT Secrets (auto-generated - regenerate for production)
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Service Ports
AUTH_SERVICE_PORT=3001
USER_SERVICE_PORT=3002
NEWS_SERVICE_PORT=3003
COURSE_SERVICE_PORT=3004
PLANNING_SERVICE_PORT=3005
STATISTICS_SERVICE_PORT=3006

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001

# Logging
LOG_LEVEL=debug
EOF

echo "✅ Development secrets generated in .env.development"
echo "⚠️  Remember to:"
echo "   1. Copy .env.development to .env"
echo "   2. Never commit .env files"
echo "   3. Generate new secrets for production"

# Make script executable
chmod +x scripts/generate-dev-secrets.sh