# Dockerfile for Notification Service
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
COPY packages/api-services/notification-service/package*.json ./packages/api-services/notification-service/
COPY packages/shared-utilities/package*.json ./packages/shared-utilities/

# Install dependencies for the entire workspace
RUN npm ci --workspaces --only=production && npm cache clean --force

# Copy shared utilities
COPY packages/shared-utilities/ ./packages/shared-utilities/

# Build shared packages
RUN npm run build --workspace=@101-school/shared-utilities

# Copy notification service source
COPY packages/api-services/notification-service/ ./packages/api-services/notification-service/

# Build notification service
RUN npm run build --workspace=@101-school/notification-service

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Set working directory to service
WORKDIR /app/packages/api-services/notification-service

# Expose port
EXPOSE 3007

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3007/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the service
CMD ["npm", "start"]