# Dockerfile for Authentication Service
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy workspace package.json files first for better caching
COPY package*.json ./
COPY packages/api-services/auth-service/package*.json ./packages/api-services/auth-service/
COPY packages/shared-utilities/package*.json ./packages/shared-utilities/
COPY packages/database-schemas/package*.json ./packages/database-schemas/

# Install dependencies for the entire workspace
RUN npm ci --workspaces --only=production && npm cache clean --force

# Copy shared utilities and database schemas
COPY packages/shared-utilities/ ./packages/shared-utilities/
COPY packages/database-schemas/ ./packages/database-schemas/

# Build shared packages
RUN npm run build --workspace=@101-school/shared-utilities
RUN npm run build --workspace=@101-school/database-schemas

# Copy auth service source
COPY packages/api-services/auth-service/ ./packages/api-services/auth-service/

# Build auth service
RUN npm run build --workspace=@101-school/auth-service

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Set working directory to service
WORKDIR /app/packages/api-services/auth-service

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the service
CMD ["npm", "start"]