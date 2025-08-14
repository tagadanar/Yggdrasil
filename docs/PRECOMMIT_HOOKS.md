# Pre-commit Hooks - Enhanced Security & Performance

## Overview

Our pre-commit hooks ensure code quality, security, and consistency before commits reach the repository. The system has been optimized for developer experience while maintaining strict quality standards.

## What Runs on Every Commit

### 1. **Code Quality & Formatting**

- ✅ **ESLint** - Automatic code style fixes
- ✅ **Prettier** - Consistent code formatting
- ✅ **Import organization** - Clean import statements

### 2. **Intelligent TypeScript Checking**

- 🎯 **Scoped analysis** - Only checks packages with staged TS files
- ⚡ **Performance optimized** - No full monorepo scans
- 🚀 **Emergency bypass** - `SKIP_TYPECHECK=true` for urgent fixes

### 3. **Security Scanning**

- 🔒 **Secret detection** - API keys, tokens, credentials
- 🛡️ **Sensitive file monitoring** - .env, config files
- 🔍 **Dependency vulnerabilities** - npm audit integration

### 4. **Commit Message Validation**

- 📝 **Conventional commits** - Enforced standard format
- 🏷️ **Scope validation** - Optional but recommended scopes
- 📏 **Length limits** - Clear, concise commit messages

---

## How It Works

### Before: Problems with Old System

```bash
❌ Full monorepo typecheck for any .ts file change
❌ Blocked urgent commits due to unrelated errors
❌ No security scanning
❌ Slow performance
❌ No emergency bypass
```

### After: Intelligent Hook System

```bash
✅ Only checks affected packages
✅ Emergency bypass mechanisms
✅ Comprehensive security scanning
✅ Fast, targeted analysis
✅ Better error reporting
```

---

## Emergency Bypass Mechanisms

### Quick Bypass for Urgent Fixes

```bash
# Skip TypeScript checking
SKIP_TYPECHECK=true git commit -m "fix: urgent production issue"

# Skip security scanning
SKIP_SECURITY=true git commit -m "fix: critical bug"

# Skip both (use sparingly!)
SKIP_TYPECHECK=true SKIP_SECURITY=true git commit -m "hotfix: emergency"
```

### When to Use Bypass

- 🚨 **Production incidents** - Critical bugs blocking users
- 🔥 **Security vulnerabilities** - Immediate patches needed
- ⏰ **Time-sensitive fixes** - Deployment deadlines

**⚠️ Always create follow-up tickets to fix bypassed issues!**

---

## TypeScript Checking Intelligence

### Package Detection

The system automatically detects which packages are affected:

```bash
# Example: Editing auth service files
packages/api-services/auth-service/src/middleware/auth.ts
packages/api-services/auth-service/src/controllers/AuthController.ts

# Result: Only checks @yggdrasil/auth-service
🔍 Running TypeScript check for 1 package(s)...
📦 Checking @yggdrasil/auth-service...
✅ @yggdrasil/auth-service typecheck passed
```

### Supported Package Patterns

- `packages/api-services/*` → `@yggdrasil/{service-name}`
- `packages/frontend/` → `@yggdrasil/frontend`
- `packages/database-schemas/` → `@yggdrasil/database-schemas`
- `packages/shared-utilities/` → `@yggdrasil/shared-utilities`

---

## Security Scanning Features

### Secret Detection Patterns

```typescript
// ❌ These will be caught:
const API_KEY = 'sk-1234567890abcdef...';
const mongoUrl = 'mongodb://user:password@localhost:27017/db';
const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// ✅ These are allowed:
const API_KEY = process.env.API_KEY;
const mongoUrl = process.env.MONGODB_URI;
const jwtToken = generateToken(user);
```

### Monitored File Types

- **Environment files**: `.env`, `.env.local`, `.env.production`
- **Config files**: `config.json`, `secrets.json`, `credentials.json`
- **Hidden files**: Any file starting with `.` that contains "env"

### Dependency Monitoring

- Runs `npm audit` to check for vulnerabilities
- Reports high-severity issues
- Suggests running `npm audit fix`

---

## Performance Improvements

### Before vs After Metrics

```bash
# Old System (Full Monorepo Check)
⏱️ Time: 45-60 seconds
📦 Packages checked: ALL (6+ packages)
🚫 Blocked commits: High (any TS error anywhere)

# New System (Targeted Check)
⏱️ Time: 5-15 seconds
📦 Packages checked: Only affected (1-2 typically)
🚫 Blocked commits: Low (only relevant errors)
```

### Smart Optimizations

- **File analysis** - Only process staged files
- **Package detection** - Map files to affected packages
- **Parallel execution** - Multiple checks run simultaneously
- **Early termination** - Stop on first failure for fast feedback

---

## Troubleshooting

### Common Issues

#### "TypeScript checking failed"

```bash
❌ @yggdrasil/auth-service typecheck failed

# Solutions:
1. Fix the TypeScript errors in the affected package
2. Use emergency bypass: SKIP_TYPECHECK=true git commit -m "..."
3. Check if package has typecheck script in package.json
```

#### "Potential secrets detected"

```bash
❌ Potential secrets detected:
  📄 src/config.ts:15
     Potential API key detected: API_KEY = "sk-abc123..."

# Solutions:
1. Move secrets to environment variables
2. Update .gitignore to exclude sensitive files
3. Use emergency bypass: SKIP_SECURITY=true git commit -m "..."
```

#### "Could not get staged files"

```bash
⚠️ Could not get staged files, checking all packages

# Solutions:
1. Ensure you're in a git repository
2. Stage some files: git add .
3. Check git status for issues
```

### Debug Mode

```bash
# Enable verbose output
DEBUG=true git commit -m "your message"

# Check what files are staged
git diff --cached --name-only
```

---

## Configuration Files

### Main Configuration

- **`.husky/pre-commit`** - Husky hook entry point
- **`package.json` lint-staged** - File pattern matching
- **`commitlint.config.js`** - Commit message rules

### Custom Scripts

- **`scripts/precommit-typecheck.js`** - Intelligent TS checking
- **`scripts/precommit-security.js`** - Security scanning

### Environment Variables

```bash
# Bypass mechanisms
SKIP_TYPECHECK=true    # Skip TypeScript checking
SKIP_SECURITY=true     # Skip security scanning
DEBUG=true             # Enable verbose output
```

---

## Best Practices

### For Developers

1. **Regular Commits** - Commit early and often
2. **Descriptive Messages** - Follow conventional commit format
3. **Fix Issues Quickly** - Don't let TS errors accumulate
4. **Use Environment Variables** - Never commit secrets

### For Emergency Situations

1. **Use Bypass Sparingly** - Only for genuine emergencies
2. **Create Follow-up Tickets** - Fix bypassed issues later
3. **Document Reasons** - Explain why bypass was needed
4. **Review Changes** - Double-check emergency commits

### For Package Maintainers

1. **Add typecheck Scripts** - Ensure packages have `npm run typecheck`
2. **Fix Errors Promptly** - Don't block other developers
3. **Update Documentation** - Keep package docs current
4. **Monitor Dependencies** - Regular `npm audit` checks

---

## Future Enhancements

### Planned Improvements

- **Test running** - Execute tests for affected packages
- **Import sorting** - Automatic import organization
- **Dead code detection** - Find unused exports
- **Performance metrics** - Track hook execution times
- **Slack integration** - Notify team of bypass usage

### Configuration Enhancements

- **Team-specific rules** - Different rules per team
- **File-based config** - External configuration files
- **Custom rules** - Plugin system for custom checks
- **CI integration** - Mirror checks in GitHub Actions

---

## Support

### Getting Help

- 📖 **Documentation** - Check this file and others in `/docs`
- 🐛 **Issues** - Create GitHub issues for bugs
- 💬 **Team Chat** - Ask in development channels
- 🔧 **Emergency** - Use bypass mechanisms

### Reporting Problems

```bash
# Include this information:
1. Error message
2. Staged files: git diff --cached --name-only
3. Environment: NODE_ENV, bypass variables
4. Package versions: npm list husky lint-staged
```

Remember: These hooks exist to help maintain code quality and security. When in doubt, it's better to fix the underlying issue than bypass the checks!
