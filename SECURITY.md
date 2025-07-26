# 🛡️ Security Configuration Guide

## 🚨 Quick Setup (New Installation)

### 1. Generate Secure Secrets

```bash
# Generate all development secrets automatically
npm run security:generate-secrets

# Copy development configuration to active environment
cp .env.development .env
```

### 2. Start Secure Services

```bash
# Start MongoDB with authentication
docker-compose up -d mongodb

# Start all application services  
npm run dev
```

## 🔐 Initial Setup (First Time)

### Environment Configuration

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Generate secure JWT secrets (minimum 32 characters):**
   ```bash
   # Option 1: Use built-in generator
   npm run security:generate-secrets
   
   # Option 2: Manual generation
   openssl rand -base64 32  # For JWT_SECRET
   openssl rand -base64 32  # For JWT_REFRESH_SECRET
   ```

3. **Generate database passwords:**
   ```bash
   openssl rand -base64 24  # For each MongoDB user
   ```

4. **Update .env file with generated values:**
   - Replace all `CHANGE_ME` values
   - Ensure JWT secrets are at least 32 characters
   - Use unique, strong passwords for all database users

### Database Security

The application uses MongoDB with authentication enabled. Three users are created:

- **`root`**: Administrative access (don't use in application)
- **`yggdrasil_app`**: Application read/write access  
- **`yggdrasil_readonly`**: Read-only access for reporting

**Connection string format:**
```
mongodb://username:password@localhost:27018/yggdrasil-dev
```

## 🔒 Security Features Implemented

### ✅ JWT Secret Management
- **Environment validation** on service startup
- **No hardcoded secrets** in codebase
- **Secure generation** of development secrets
- **Initialization checks** prevent uninitialized JWT operations

### ✅ Password Security
- **No password logging** anywhere in the system
- **Secure authentication operations** with sanitized logs
- **bcrypt password hashing** with proper salt rounds
- **SecurityLogger** prevents sensitive data leakage

### ✅ Database Authentication  
- **MongoDB authentication** enabled by default
- **Role-based access control** with limited permissions
- **Connection retry logic** with graceful failure handling
- **Credential masking** in logs

### ✅ Repository Security
- **Comprehensive .gitignore** excludes all sensitive files
- **Environment examples** provide secure templates  
- **Debug file cleanup** removes potential data leaks
- **Security documentation** guides proper setup

## 🚀 Production Deployment

### Secret Management

**For production environments:**

1. **Use a secret management service:**
   - HashiCorp Vault
   - AWS Secrets Manager  
   - Azure Key Vault
   - Google Secret Manager

2. **Generate production secrets:**
   ```bash
   # Minimum 64 characters for production
   openssl rand -base64 64 | tr -d '=' | tr -d '\n'
   ```

3. **Rotate secrets regularly:**
   - JWT secrets: Every 90 days
   - Database passwords: Every 30 days
   - API keys: According to provider recommendations

### Infrastructure Security

1. **Enable TLS/SSL** for all connections
2. **Use strong, unique passwords** (minimum 32 characters)  
3. **Enable audit logging** for all database operations
4. **Configure firewall rules** to restrict database access
5. **Use replica sets** for MongoDB high availability
6. **Enable MongoDB encryption at rest**

### Application Security

1. **HTTPS only** in production
2. **Security headers** configured (HSTS, CSP, etc.)
3. **Rate limiting** enabled on all endpoints
4. **Input validation** on all user inputs
5. **Regular security audits** and dependency updates

## 🧪 Testing Security

### Verify Environment Setup

```bash
# Test that services fail without secrets
unset JWT_SECRET
npm run dev  # Should fail with validation error

# Test with valid secrets  
export JWT_SECRET=$(openssl rand -base64 32)
export JWT_REFRESH_SECRET=$(openssl rand -base64 32)
npm run dev  # Should start successfully
```

### Security Audit

```bash
# Run comprehensive test suite
npm run test:quiet

# Check for password logging
npm run dev 2>&1 | grep -i password  # Should return no matches

# Verify MongoDB authentication
docker exec yggdrasil-mongodb mongosh --eval "db.adminCommand('ping')"  # Should require auth
```

## 📋 Security Checklist

### Development Setup ✓
- [ ] All `CHANGE_ME` values replaced in .env
- [ ] .env file not committed to git
- [ ] JWT secrets are at least 32 characters  
- [ ] Database passwords are unique and strong
- [ ] MongoDB authentication enabled
- [ ] No sensitive data in application logs
- [ ] All services start successfully
- [ ] Authentication flow works end-to-end

### Production Ready ✓  
- [ ] Secret management service configured
- [ ] HTTPS enabled for all connections
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] Database encryption enabled
- [ ] Firewall rules configured
- [ ] Monitoring and alerting setup
- [ ] Regular backup strategy implemented
- [ ] Incident response plan documented

## 🚨 Security Incident Response

### If Credentials Are Compromised

1. **Immediate Actions:**
   ```bash
   # Rotate JWT secrets
   export JWT_SECRET=$(openssl rand -base64 64)
   export JWT_REFRESH_SECRET=$(openssl rand -base64 64)
   
   # Restart all services
   npm run dev:stop
   npm run dev
   ```

2. **Database Compromise:**
   ```bash
   # Connect to MongoDB as root
   mongosh mongodb://root:password@localhost:27018/admin
   
   # Change application user password
   db.getSiblingDB('yggdrasil-dev').changeUserPassword('yggdrasil_app', 'new_secure_password')
   ```

3. **Document the incident** and review security practices

### Regular Maintenance

- **Weekly:** Review access logs for anomalies
- **Monthly:** Update dependencies and security patches  
- **Quarterly:** Rotate JWT secrets and review permissions
- **Annually:** Complete security audit and penetration testing

## 📞 Support

For security questions or to report vulnerabilities:
- Review this documentation first
- Check the main project README
- Create a GitHub issue for security improvements
- For critical vulnerabilities, follow responsible disclosure practices

---

**Remember:** Security is an ongoing process, not a one-time setup. Regular maintenance and updates are essential for maintaining a secure platform.