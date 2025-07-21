# Debug Scripts Documentation

This directory contains essential debugging utilities organized by category. All scripts have been reviewed and only the most useful ones have been kept.

## Directory Structure

### `/auth/` - Authentication Debugging
- **`auth-api-test.js`** - Comprehensive auth API testing script that tests all auth endpoints and validates responses for demo users. Consolidates functionality from multiple original debug scripts.
- **`comprehensive-auth-diagnosis.js`** - Deep diagnostic script for authentication issues. Tests user lookup, password hashing, database collections, and bcrypt verification. Essential for debugging complex auth problems.
- **`live-auth-verification.js`** - Enhanced live authentication verification script. Creates test users, validates complete auth flow, and provides comprehensive reporting. Replaces the original verify-live-auth.js with better error handling and integration.

### `/database/` - Database Management & Debugging  
- **`create-demo-users.js`** - Creates the standard demo users (admin, teacher, staff, student) with proper password hashing. Essential for test environment setup.
- **`database-connection-test.js`** - Tests database connectivity across different MongoDB configurations and ports. Useful for debugging database connection issues.

### `/services/` - Service Health & Diagnostics
- **`auth-service-health-check.js`** - Comprehensive health check for the auth service including endpoint testing and response validation. Critical for debugging service availability issues.

### `/frontend/` - Frontend Testing & Validation
- **`testid-validation.js`** - Validates presence of critical testid attributes for test automation reliability. Enhanced version of the original quick-testid-check.js with better error handling, service health checks, and comprehensive reporting.

## Justification for Kept Scripts

These scripts were retained because they:

1. **Provide unique diagnostic value** - Each script serves a distinct debugging purpose that isn't duplicated elsewhere
2. **Are regularly useful** - These address common debugging scenarios (auth issues, database connectivity, service health)
3. **Are well-structured** - Each script has clear purpose, good error handling, and informative output
4. **Save development time** - Manual debugging of these issues would be time-consuming without these tools

## Scripts That Were Removed

The following categories of scripts were deleted as obsolete:

- **One-off debugging scripts** - Scripts created to solve specific bugs that are now resolved (e.g., `debug-jwt-role-issue.js`, `debug-demo-role-issue.js`)
- **Duplicate functionality** - Multiple scripts that tested the same things with minor variations
- **Outdated approaches** - Scripts using old authentication patterns or database schemas
- **Test artifacts** - Scripts that were created during development but are no longer needed

## Usage

Each script can be run independently:

```bash
# Test auth API endpoints
node packages/testing-utilities/scripts/debug/auth/auth-api-test.js

# Diagnose authentication issues  
node packages/testing-utilities/scripts/debug/auth/comprehensive-auth-diagnosis.js

# Create demo users for testing
node packages/testing-utilities/scripts/debug/database/create-demo-users.js

# Test database connectivity
node packages/testing-utilities/scripts/debug/database/database-connection-test.js

# Check auth service health
node packages/testing-utilities/scripts/debug/services/auth-service-health-check.js

# Validate frontend testids for test automation
node packages/testing-utilities/scripts/debug/frontend/testid-validation.js

# Verify live authentication flow during test execution
node packages/testing-utilities/scripts/debug/auth/live-auth-verification.js
```

These scripts are meant for development and debugging - they should not be run in production environments.