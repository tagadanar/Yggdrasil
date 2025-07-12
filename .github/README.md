# 🌳 Yggdrasil CI/CD Pipeline

This directory contains the comprehensive CI/CD pipeline configuration for the Yggdrasil Educational Platform.

## 🚀 Available Workflows

### 1. **Main CI/CD Pipeline** (`ci-cd.yml`)
**Trigger**: Push to `main`/`develop`, Pull Requests  
**Duration**: ~30-45 minutes  
**Coverage**: Complete platform validation

#### Pipeline Stages:
1. **🔍 Code Quality & Linting** (10 min)
   - ESLint validation
   - TypeScript type checking
   - Code style enforcement

2. **🔒 Security Scanning** (10 min)  
   - Dependency vulnerability scan
   - Secret detection
   - Security audit

3. **🔨 Build Validation** (15 min)
   - All 7 microservices build validation
   - Multi-service parallel builds
   - Build artifact verification

4. **🧪 Testing Suite** (25-30 min)
   - **Functional Tests**: 178 tests across 6 services
   - **Integration Tests**: 122 tests with 100% success rate
   - **Cross-Service Integration**: Complex workflows
   - **End-to-End Tests**: Complete user journeys

5. **⚡ Performance Testing** (15 min)
   - Load testing on main branch
   - Performance regression detection
   - Resource utilization monitoring

6. **🐳 Docker Build & Push** (20 min)
   - Multi-platform builds (amd64/arm64)
   - Automated image versioning
   - Container registry push

### 2. **Security Pipeline** (`security.yml`)
**Trigger**: Daily at 02:00 UTC, Push, PRs  
**Duration**: ~20-25 minutes  
**Focus**: Comprehensive security assessment

#### Security Checks:
- **CodeQL Analysis**: JavaScript/TypeScript security patterns
- **Dependency Scanning**: npm audit with vulnerability assessment
- **Secret Detection**: TruffleHog + custom patterns
- **Docker Security**: Trivy container vulnerability scanning
- **Compliance**: GDPR pattern detection
- **Security Benchmarking**: Configuration review

### 3. **Dependency Updates** (`dependency-updates.yml`)
**Trigger**: Weekly (Monday 09:00 UTC)  
**Duration**: ~15 minutes  
**Purpose**: Automated dependency monitoring

#### Features:
- Dependency vulnerability audit
- Outdated package detection  
- License compliance checking
- Automated issue creation with reports
- Security update recommendations

### 4. **Production Deployment** (`deploy-production.yml`)
**Trigger**: Release tags, Manual dispatch  
**Duration**: ~25-40 minutes  
**Environments**: Staging → Production

#### Deployment Process:
- **Pre-deployment Validation**: Health checks and critical tests
- **Multi-platform Builds**: Docker images for production
- **Staging Deployment**: Automatic staging environment deployment
- **Production Deployment**: Zero-downtime rolling updates
- **Post-deployment Verification**: Smoke tests and health checks
- **Rollback Capability**: Automated rollback on failure

## 📊 Success Metrics

### Test Coverage
```
✅ Functional Tests: 178/178 (100% success)
✅ Integration Tests: 122/122 (100% success)  
✅ Cross-Service Tests: 8/8 (100% success)
✅ End-to-End Tests: Complete user workflows
```

### Service Coverage
- 🔐 **Auth Service**: Authentication & authorization
- 👤 **User Service**: User management & profiles  
- 📚 **Course Service**: Course management & enrollment
- 📰 **News Service**: News & announcements
- 📅 **Planning Service**: Calendar & event management
- 📊 **Statistics Service**: Analytics & reporting
- 🔔 **Notification Service**: Real-time notifications

## 🔧 Configuration Requirements

### Repository Secrets
```yaml
# Docker Registry (optional)
DOCKER_USERNAME: your-docker-username
DOCKER_PASSWORD: your-docker-password

# Deployment (customize for your infrastructure)
KUBECONFIG: base64-encoded-kubeconfig
DEPLOY_TOKEN: deployment-token
```

### Environment Variables
```yaml
NODE_VERSION: '18'
MONGODB_URI: 'mongodb://localhost:27017/yggdrasil_test'
JWT_SECRET: 'test-jwt-secret-for-ci'
BCRYPT_ROUNDS: 10
```

## 🌐 Deployment Environments

### Staging Environment
- **URL**: `https://staging.yggdrasil.example.com`
- **Purpose**: Pre-production testing
- **Auto-deploy**: Feature branches
- **Database**: Staging MongoDB cluster

### Production Environment  
- **URL**: `https://api.yggdrasil.example.com`
- **Purpose**: Live production system
- **Deploy**: Release tags only
- **Database**: Production MongoDB cluster

## 🚨 Monitoring & Alerts

### Automated Issue Creation
- **Security Issues**: Critical vulnerabilities detected
- **Dependency Updates**: Weekly dependency reports
- **Deployment Status**: Success/failure notifications
- **Performance Regressions**: Automatic alerts

### Status Checks
- **Health Endpoints**: All services monitored
- **Database Connectivity**: MongoDB health checks
- **Service Dependencies**: Cross-service communication
- **Performance Metrics**: Response time monitoring

## 🔄 Workflow Customization

### Adding New Services
1. Add service to build matrix in `ci-cd.yml`
2. Include service in functional/integration test suites
3. Add Docker build configuration
4. Update deployment scripts

### Modifying Test Suites
```bash
# Run specific test suites locally
npm run test:functional:summary
npm run test:integration:summary  
npm run test:e2e:summary
```

### Environment Configuration
- Modify environment-specific variables in workflow files
- Update deployment scripts for your infrastructure
- Configure monitoring endpoints and health checks

## 📈 Performance Benchmarks

### Pipeline Performance
- **Total CI Time**: ~45 minutes for complete validation
- **Parallel Execution**: Maximum efficiency with matrix builds
- **Caching**: npm cache optimization for faster installs
- **Artifact Management**: Optimized artifact storage

### Test Execution Times
- **Unit Tests**: ~5 minutes per service
- **Integration Tests**: ~8 minutes per service  
- **Cross-Service Tests**: ~15 minutes
- **End-to-End Tests**: ~10 minutes

## 🛠️ Local Development

### Running CI Pipeline Locally
```bash
# Install dependencies
npm ci

# Run quality checks
npm run lint
npm run typecheck

# Run test suites
npm run test:all:summary

# Build all services
npm run build
```

### Docker Testing
```bash
# Build service images
cd packages/api-services/auth-service
docker build -t yggdrasil/auth-service:local .

# Security scanning
docker run --rm aquasec/trivy image yggdrasil/auth-service:local
```

## 📚 Additional Resources

- **[Testing Documentation](../packages/functional-tests/README.md)**: Comprehensive testing guide
- **[Service Architecture](../CLAUDE.md)**: Platform architecture overview  
- **[Security Guidelines](../docs/security.md)**: Security best practices
- **[Deployment Guide](../docs/deployment.md)**: Infrastructure setup

---

## 🎯 Quick Start Checklist

- [ ] Configure repository secrets for Docker registry
- [ ] Set up deployment environment credentials  
- [ ] Customize deployment scripts for your infrastructure
- [ ] Configure monitoring and alerting endpoints
- [ ] Test staging deployment process
- [ ] Verify production deployment readiness

**🌳 The Yggdrasil CI/CD pipeline ensures robust, secure, and reliable deployments across all environments.**