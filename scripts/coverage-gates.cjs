#!/usr/bin/env node

/**
 * Coverage Gates Enforcement Script
 * Validates that all packages meet their coverage thresholds
 * Used in CI/CD to block deployments with insufficient coverage
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Package directories to check
const packages = [
  'packages/shared-utilities',
  'packages/frontend',
  'packages/api-services/auth-service',
  'packages/api-services/user-service',
  'packages/api-services/news-service',
  'packages/api-services/course-service',
  'packages/api-services/statistics-service',
  'packages/api-services/planning-service',
];

// Expected thresholds from jest configurations
const expectedThresholds = {
  'packages/shared-utilities': {
    statements: 60, branches: 35, functions: 45, lines: 60
  },
  'packages/frontend': {
    statements: 25, branches: 20, functions: 30, lines: 25
  },
  'packages/api-services/auth-service': {
    statements: 40, branches: 15, functions: 40, lines: 40
  },
  // Default for other services (using base config)
  default: {
    statements: 50, branches: 30, functions: 40, lines: 50
  }
};

/**
 * Read coverage summary for a package
 */
function readCoverageSummary(packagePath) {
  const summaryPath = path.join(__dirname, '..', packagePath, 'coverage/coverage-summary.json');
  
  if (!fs.existsSync(summaryPath)) {
    return null;
  }
  
  try {
    return JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  } catch (error) {
    console.error(`${colors.red}Error reading coverage summary for ${packagePath}:${colors.reset}`, error.message);
    return null;
  }
}

/**
 * Check if coverage meets threshold
 */
function checkThreshold(actual, expected, metric) {
  return actual >= expected;
}

/**
 * Format percentage for display
 */
function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

/**
 * Get status symbol and color
 */
function getStatus(passing) {
  return passing 
    ? `${colors.green}✓${colors.reset}` 
    : `${colors.red}✗${colors.reset}`;
}

/**
 * Main coverage gates check
 */
function main() {
  console.log(`${colors.bold}${colors.blue}🛡️  Coverage Gates Enforcement${colors.reset}\n`);
  
  let overallPassing = true;
  let totalPackagesChecked = 0;
  let totalPackagesPassed = 0;
  
  const results = [];
  
  for (const packagePath of packages) {
    const coverage = readCoverageSummary(packagePath);
    
    if (!coverage) {
      console.log(`${colors.yellow}⚠️  No coverage data found for ${packagePath}${colors.reset}`);
      continue;
    }
    
    totalPackagesChecked++;
    
    const packageName = path.basename(packagePath);
    const thresholds = expectedThresholds[packagePath] || expectedThresholds.default;
    const total = coverage.total;
    
    console.log(`${colors.bold}📦 ${packageName}${colors.reset}`);
    
    const metrics = ['statements', 'branches', 'functions', 'lines'];
    let packagePassing = true;
    
    for (const metric of metrics) {
      const actual = total[metric].pct;
      const expected = thresholds[metric];
      const passing = checkThreshold(actual, expected, metric);
      
      if (!passing) {
        packagePassing = false;
        overallPassing = false;
      }
      
      const status = getStatus(passing);
      const actualFormatted = formatPercent(actual);
      const expectedFormatted = formatPercent(expected);
      
      console.log(`   ${status} ${metric.padEnd(11)} ${actualFormatted.padStart(8)} / ${expectedFormatted} threshold`);
    }
    
    if (packagePassing) {
      totalPackagesPassed++;
      console.log(`   ${colors.green}✅ Package passed coverage gates${colors.reset}`);
    } else {
      console.log(`   ${colors.red}❌ Package failed coverage gates${colors.reset}`);
    }
    
    results.push({
      package: packageName,
      passing: packagePassing,
      coverage: total
    });
    
    console.log(); // Empty line
  }
  
  // Summary
  console.log(`${colors.bold}📊 Coverage Gates Summary${colors.reset}`);
  console.log(`   Packages checked: ${totalPackagesChecked}`);
  console.log(`   Packages passed:  ${colors.green}${totalPackagesPassed}${colors.reset}`);
  console.log(`   Packages failed:  ${colors.red}${totalPackagesChecked - totalPackagesPassed}${colors.reset}`);
  console.log(`   Success rate:     ${formatPercent((totalPackagesPassed / totalPackagesChecked) * 100)}`);
  
  if (overallPassing) {
    console.log(`\n${colors.green}${colors.bold}🎉 All coverage gates passed! Deployment can proceed.${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bold}🚫 Coverage gates failed! Please improve test coverage before deploying.${colors.reset}`);
    
    console.log(`\n${colors.yellow}💡 Quick fixes:${colors.reset}`);
    console.log(`   • Add unit tests for uncovered functions`);
    console.log(`   • Add edge case tests to improve branch coverage`);
    console.log(`   • Focus on critical business logic first`);
    console.log(`   • Use Jest coverage reports to find untested code`);
    
    process.exit(1);
  }
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error(`${colors.red}💥 Coverage gates script crashed:${colors.reset}`, error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`${colors.red}💥 Unhandled promise rejection:${colors.reset}`, reason);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, readCoverageSummary, checkThreshold };