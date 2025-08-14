#!/usr/bin/env node

/**
 * Security scanning for pre-commit hooks
 * Checks for secrets, security-sensitive patterns, and vulnerable dependencies
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Security patterns to check for
const SECRET_PATTERNS = [
  // API Keys and tokens
  { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]{20,}['"]/gi, message: 'Potential API key detected' },
  {
    pattern: /secret[_-]?key\s*[:=]\s*['"][^'"]{20,}['"]/gi,
    message: 'Potential secret key detected',
  },
  {
    pattern: /access[_-]?token\s*[:=]\s*['"][^'"]{20,}['"]/gi,
    message: 'Potential access token detected',
  },

  // JWT tokens
  {
    pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
    message: 'Potential JWT token detected',
  },

  // Database URLs with credentials
  { pattern: /mongodb:\/\/[^:]+:[^@]+@[^\/]+/gi, message: 'MongoDB URL with credentials detected' },
  {
    pattern: /postgres:\/\/[^:]+:[^@]+@[^\/]+/gi,
    message: 'PostgreSQL URL with credentials detected',
  },
  { pattern: /mysql:\/\/[^:]+:[^@]+@[^\/]+/gi, message: 'MySQL URL with credentials detected' },

  // AWS credentials
  { pattern: /AKIA[0-9A-Z]{16}/g, message: 'AWS Access Key ID detected' },
  { pattern: /[A-Za-z0-9\/+=]{40}/g, message: 'Potential AWS Secret Access Key detected' },

  // GitHub tokens
  { pattern: /ghp_[A-Za-z0-9]{36}/g, message: 'GitHub Personal Access Token detected' },
  {
    pattern: /github_pat_[A-Za-z0-9_]{82}/g,
    message: 'GitHub Fine-grained Personal Access Token detected',
  },

  // Other common secrets
  { pattern: /sk-[A-Za-z0-9]{48}/g, message: 'OpenAI API key detected' },
  { pattern: /xoxb-[0-9]{11}-[0-9]{11}-[A-Za-z0-9]{24}/g, message: 'Slack Bot token detected' },
];

// Files that commonly contain secrets
const SENSITIVE_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'config.json',
  'secrets.json',
  'credentials.json',
];

// Get staged files
function getStagedFiles() {
  try {
    const staged = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf8',
      cwd: process.cwd(),
    }).trim();

    if (!staged) return [];

    return staged.split('\n').filter(file => file.trim().length > 0);
  } catch (error) {
    console.error('❌ Could not get staged files:', error.message);
    return [];
  }
}

// Check file content for secrets
function scanFileForSecrets(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];

    for (const { pattern, message } of SECRET_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Skip false positives
          if (isLikelyFalsePositive(match, content, filePath)) {
            continue;
          }

          issues.push({
            file: filePath,
            issue: message,
            match: match.substring(0, 50) + (match.length > 50 ? '...' : ''),
            line: getLineNumber(content, match),
          });
        }
      }
    }

    return issues;
  } catch (error) {
    console.warn(`⚠️ Could not scan ${filePath}:`, error.message);
    return [];
  }
}

// Check if a match is likely a false positive
function isLikelyFalsePositive(match, content, filePath) {
  const lowerMatch = match.toLowerCase();
  const lowerContent = content.toLowerCase();
  const fileName = path.basename(filePath).toLowerCase();

  // Skip documentation files with examples
  if (fileName.includes('.md') || fileName.includes('readme') || fileName.includes('doc')) {
    return true;
  }

  // Skip example/placeholder values
  if (
    lowerMatch.includes('example') ||
    lowerMatch.includes('placeholder') ||
    lowerMatch.includes('your_') ||
    lowerMatch.includes('xxxx') ||
    lowerMatch.includes('****') ||
    lowerMatch.includes('sk-1234') ||
    lowerMatch.includes('localhost')
  ) {
    return true;
  }

  // Skip test files with obvious test data
  if (
    lowerContent.includes('test') &&
    (lowerMatch.includes('test') || lowerMatch.includes('mock') || lowerMatch.includes('fake'))
  ) {
    return true;
  }

  // Skip development database URLs in package.json
  if (fileName === 'package.json' && lowerMatch.includes('localhost')) {
    return true;
  }

  return false;
}

// Get line number for a match
function getLineNumber(content, match) {
  const index = content.indexOf(match);
  if (index === -1) return 1;

  return content.substring(0, index).split('\n').length;
}

// Check for sensitive file additions
function checkSensitiveFiles(stagedFiles) {
  const sensitiveFileIssues = [];

  for (const file of stagedFiles) {
    const basename = path.basename(file);
    const isHidden = basename.startsWith('.');

    if (SENSITIVE_FILES.includes(basename)) {
      sensitiveFileIssues.push({
        file,
        issue: 'Sensitive configuration file detected',
        recommendation: 'Ensure no secrets are committed',
      });
    }

    // Check for new .env files
    if (isHidden && basename.includes('env')) {
      sensitiveFileIssues.push({
        file,
        issue: 'Environment file detected',
        recommendation: 'Verify no production secrets are included',
      });
    }
  }

  return sensitiveFileIssues;
}

// Check dependencies for known vulnerabilities
function checkDependencyVulnerabilities() {
  try {
    console.log('🔍 Checking for dependency vulnerabilities...');

    // Run npm audit
    execSync('npm audit --audit-level moderate', {
      stdio: 'pipe',
      cwd: process.cwd(),
    });

    console.log('✅ No high-severity vulnerabilities found');
    return true;
  } catch (error) {
    if (error.status === 1) {
      console.log('⚠️ Dependency vulnerabilities found:');
      console.log(error.stdout.toString());
      console.log('\n💡 Run "npm audit fix" to resolve fixable issues');
      return false;
    }

    // npm audit not available or other error
    console.log('⚠️ Could not check dependencies, continuing...');
    return true;
  }
}

// Main security scan
function runSecurityScan() {
  console.log('🔒 Running security scan...');

  // Check for bypass
  if (process.env.SKIP_SECURITY === 'true') {
    console.log('⚠️ Security scanning skipped (SKIP_SECURITY=true)');
    return true;
  }

  const stagedFiles = getStagedFiles();

  if (stagedFiles.length === 0) {
    console.log('✅ No files staged, skipping security scan');
    return true;
  }

  console.log(`📄 Scanning ${stagedFiles.length} staged file(s)...`);

  let hasIssues = false;

  // Check for secrets in staged files
  const allSecretIssues = [];
  for (const file of stagedFiles) {
    const secretIssues = scanFileForSecrets(file);
    allSecretIssues.push(...secretIssues);
  }

  if (allSecretIssues.length > 0) {
    console.log('\n❌ Potential secrets detected:');
    for (const issue of allSecretIssues) {
      console.log(`  📄 ${issue.file}:${issue.line}`);
      console.log(`     ${issue.issue}: ${issue.match}`);
    }
    hasIssues = true;
  }

  // Check for sensitive files
  const sensitiveIssues = checkSensitiveFiles(stagedFiles);
  if (sensitiveIssues.length > 0) {
    console.log('\n⚠️ Sensitive files detected:');
    for (const issue of sensitiveIssues) {
      console.log(`  📄 ${issue.file}: ${issue.issue}`);
      console.log(`     ${issue.recommendation}`);
    }
  }

  // Check dependencies (non-blocking for now)
  checkDependencyVulnerabilities();

  if (hasIssues) {
    console.log('\n❌ Security issues found!');
    console.log('\n💡 To bypass security checks for urgent fixes:');
    console.log('   SKIP_SECURITY=true git commit -m "urgent: your message"');
    console.log('\n🔍 To review issues:');
    console.log('   - Remove any real secrets from staged files');
    console.log('   - Use environment variables for sensitive data');
    console.log('   - Update .gitignore to exclude sensitive files');
    return false;
  }

  console.log('✅ Security scan passed!');
  return true;
}

// Main execution
if (require.main === module) {
  const success = runSecurityScan();
  process.exit(success ? 0 : 1);
}

module.exports = { runSecurityScan };
