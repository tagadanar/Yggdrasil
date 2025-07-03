# Dockerfile for API Gateway
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
COPY packages/api-gateway/package*.json ./packages/api-gateway/
COPY packages/shared-utilities/package*.json ./packages/shared-utilities/

# Install dependencies for the entire workspace
RUN npm ci --workspaces --only=production && npm cache clean --force

# Copy shared utilities
COPY packages/shared-utilities/ ./packages/shared-utilities/

# Build shared packages
RUN npm run build --workspace=@101-school/shared-utilities

# Copy API gateway source
COPY packages/api-gateway/ ./packages/api-gateway/

# Build API gateway
RUN npm run build --workspace=@101-school/api-gateway

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Set working directory to service
WORKDIR /app/packages/api-gateway

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the service
CMD ["npm", "start"]