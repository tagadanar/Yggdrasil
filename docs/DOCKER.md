# Docker Deployment Guide

This guide covers the complete Docker setup and deployment process for the 101 School Platform.

## Overview

The 101 School Platform is containerized using Docker with the following architecture:

- **8 Microservices**: Auth, User, Course, Planning, News, Statistics, Notification services, plus API Gateway
- **1 Frontend**: Next.js application
- **Infrastructure**: MongoDB, Redis, Nginx, MailHog (dev)
- **Orchestration**: Docker Compose (dev) / Docker Swarm (prod)

## Prerequisites

- Docker Engine 20.10+ and Docker Compose V2
- Node.js 18+ (for local development)
- At least 4GB RAM and 20GB disk space
- For production: Docker Swarm cluster

## Development Environment

### Quick Start

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd Yggdrasil
   cp .env.example .env
   ```

2. **Start the development environment**:
   ```bash
   ./scripts/docker-dev.sh start
   ```

3. **Access the applications**:
   - Frontend: http://localhost:3100
   - API Gateway: http://localhost:3000
   - MailHog UI: http://localhost:8025
   - Nginx (SSL): https://localhost

### Available Commands

```bash
# Development environment management
./scripts/docker-dev.sh start      # Start all services
./scripts/docker-dev.sh stop       # Stop all services
./scripts/docker-dev.sh restart    # Restart all services
./scripts/docker-dev.sh status     # Show service status
./scripts/docker-dev.sh logs       # View all logs
./scripts/docker-dev.sh logs auth-service  # View specific service logs

# Development tools
./scripts/docker-dev.sh test       # Run tests in all services
./scripts/docker-dev.sh build      # Build all Docker images
./scripts/docker-dev.sh clean      # Clean up all Docker resources
./scripts/docker-dev.sh db-reset   # Reset the database
```

### Service Ports

| Service | Container Port | Host Port | Description |
|---------|---------------|-----------|-------------|
| Frontend | 3000 | 3100 | Next.js application |
| API Gateway | 3000 | 3000 | Main API entry point |
| Auth Service | 3001 | 3001 | Authentication service |
| User Service | 3002 | 3002 | User management |
| Course Service | 3003 | 3003 | Course management |
| Planning Service | 3004 | 3004 | Calendar and scheduling |
| News Service | 3005 | 3005 | News and announcements |
| Statistics Service | 3006 | 3006 | Analytics and reporting |
| Notification Service | 3007 | 3007 | Real-time notifications |
| MongoDB | 27017 | 27017 | Database |
| Redis | 6379 | 6379 | Cache and sessions |
| MailHog SMTP | 1025 | 1025 | Email testing |
| MailHog UI | 8025 | 8025 | Email interface |
| Nginx HTTP | 80 | 80 | Load balancer |
| Nginx HTTPS | 443 | 443 | SSL termination |

## Production Deployment

### Prerequisites

1. **Initialize Docker Swarm**:
   ```bash
   docker swarm init
   ```

2. **Set environment variables**:
   ```bash
   export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/school_platform"
   export REDIS_URL="redis://prod-redis:6379"
   export JWT_SECRET="your-secure-jwt-secret"
   export NEXTAUTH_SECRET="your-secure-nextauth-secret"
   export DOCKER_REGISTRY="your-registry.com"
   ```

### Deployment Commands

```bash
# Production deployment management
./scripts/docker-prod.sh deploy     # Deploy to production
./scripts/docker-prod.sh update     # Update deployment
./scripts/docker-prod.sh status     # Show deployment status
./scripts/docker-prod.sh health     # Perform health checks

# Service management
./scripts/docker-prod.sh scale auth-service 3  # Scale auth service to 3 replicas
./scripts/docker-prod.sh logs api-gateway      # View API gateway logs

# Build and deployment
./scripts/docker-prod.sh build      # Build and push images to registry
./scripts/docker-prod.sh rollback   # Rollback deployment
./scripts/docker-prod.sh remove     # Remove production stack
```

### Production Features

- **High Availability**: Multiple replicas for critical services
- **Health Checks**: Automatic health monitoring and restart
- **Rolling Updates**: Zero-downtime deployments
- **SSL Termination**: Nginx with SSL/TLS encryption
- **Load Balancing**: Nginx with round-robin load balancing
- **Rate Limiting**: API rate limiting and security headers
- **Secrets Management**: Docker secrets for sensitive data
- **Resource Limits**: CPU and memory constraints
- **Logging**: Centralized logging with rotation
- **Monitoring**: Health checks and metrics endpoints

## Architecture Details

### Container Images

Each service uses multi-stage Docker builds for optimization:

1. **Dependencies Stage**: Install npm packages
2. **Build Stage**: Compile TypeScript and build assets
3. **Runtime Stage**: Minimal production image with only runtime dependencies

### Network Architecture

```
┌─────────────────┐    ┌──────────────────┐
│     Nginx       │────│    Frontend      │
│  Load Balancer  │    │   (Next.js)      │
└─────────────────┘    └──────────────────┘
         │
         ▼
┌─────────────────┐    ┌──────────────────┐
│   API Gateway   │────│   Microservices  │
│                 │    │  (Auth, User,    │
│                 │    │   Course, etc.)  │
└─────────────────┘    └──────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│     Redis       │    │     MongoDB      │
│   (Sessions)    │    │   (Database)     │
└─────────────────┘    └──────────────────┘
```

### Data Persistence

- **MongoDB**: Database data persisted to `mongodb_data` volume
- **Redis**: Cache data persisted to `redis_data` volume
- **SSL Certificates**: Stored in `nginx/ssl` directory
- **Application Logs**: Available via `docker logs` or logging drivers

## Configuration

### Environment Variables

Key environment variables for configuration:

```bash
# Database
MONGODB_URI=mongodb://user:pass@host:port/database
REDIS_URL=redis://host:port

# Authentication
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3100
NEXTAUTH_SECRET=your-nextauth-secret

# Email (SMTP)
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@101school.com

# Security
CORS_ORIGIN=http://localhost:3100
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Volume Mounts

Development volumes for hot reloading:
- Source code mounted for real-time development
- Node modules cached for faster builds
- Database and cache data persisted

Production volumes:
- Only data directories mounted
- Application code baked into images
- Secrets mounted securely

## Health Checks

All services include health check endpoints:

- **Endpoint**: `GET /health`
- **Response**: JSON with service status and dependencies
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3 attempts before marking unhealthy

Example health check response:
```json
{
  "status": "healthy",
  "service": "auth-service",
  "version": "1.0.0",
  "uptime": 3600,
  "dependencies": {
    "mongodb": "connected",
    "redis": "connected"
  }
}
```

## Monitoring and Logs

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service

# Production
docker service logs -f school-platform_auth-service
```

### Monitoring

Services expose metrics endpoints for monitoring:
- **Prometheus metrics**: `GET /metrics`
- **Health status**: `GET /health`
- **Service info**: `GET /info`

### Resource Usage

Check resource usage:
```bash
# Development
docker stats

# Production
docker service ps school-platform
```

## Security

### SSL/TLS

- Self-signed certificates for development
- Let's Encrypt or commercial certificates for production
- TLS 1.2+ only with secure cipher suites

### Network Security

- Services isolated in Docker networks
- No direct external access to services (except through API Gateway)
- Rate limiting on all API endpoints
- CORS protection configured

### Secrets Management

Production secrets managed via:
- Docker Secrets (recommended for Swarm)
- Environment variables (development)
- External secret management systems (Vault, etc.)

## Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   # Check what's using the port
   sudo lsof -i :3000
   
   # Stop conflicting services
   sudo systemctl stop nginx  # if running locally
   ```

2. **Permission issues**:
   ```bash
   # Fix Docker permissions
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

3. **Out of disk space**:
   ```bash
   # Clean up Docker resources
   docker system prune -a
   
   # Remove unused volumes
   docker volume prune
   ```

4. **Services not starting**:
   ```bash
   # Check logs
   docker-compose logs <service-name>
   
   # Check health
   docker-compose ps
   ```

### Debug Mode

Enable debug logging:
```bash
# Development
ENABLE_DEBUG_LOGS=true docker-compose up

# Production
# Set LOG_LEVEL=debug in environment
```

### Database Issues

Reset database if needed:
```bash
# Development
./scripts/docker-dev.sh db-reset

# Production (use with caution)
docker exec -it mongodb mongo school_platform --eval "db.dropDatabase()"
```

## Performance Optimization

### Resource Limits

Production containers have resource limits:
- **CPU**: 0.5-2.0 cores per service
- **Memory**: 256MB-1GB per service
- **Disk I/O**: SSD recommended for database

### Scaling

Scale services based on load:
```bash
# Scale critical services
./scripts/docker-prod.sh scale auth-service 3
./scripts/docker-prod.sh scale api-gateway 2
./scripts/docker-prod.sh scale frontend 2
```

### Caching

Redis caching is configured for:
- Session storage
- API response caching
- Rate limiting counters
- Temporary data storage

## Backup and Recovery

### Database Backup

```bash
# Backup MongoDB
docker exec mongodb mongodump --out /backup --db school_platform

# Restore MongoDB
docker exec mongodb mongorestore /backup
```

### Redis Backup

```bash
# Redis automatically creates snapshots
# Copy RDB file for backup
docker exec redis redis-cli BGSAVE
```

### Configuration Backup

- Environment files (`.env`)
- Docker Compose files
- Nginx configuration
- SSL certificates

## Migration

### Upgrading

1. **Backup data** before upgrading
2. **Pull latest images**
3. **Run migration scripts** if needed
4. **Deploy with rolling update**
5. **Verify health** of all services

### Rollback

```bash
# Quick rollback
./scripts/docker-prod.sh rollback

# Manual rollback to specific version
docker service update --image registry/service:v1.0 school-platform_auth-service
```

This completes the comprehensive Docker deployment guide for the 101 School Platform.