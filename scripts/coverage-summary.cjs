#!/usr/bin/env node

/**
 * Coverage Summary Dashboard
 * Generates a comprehensive overview of test coverage across all packages
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

// Package configurations
const packages = [
  {
    path: 'packages/shared-utilities',
    name: 'Shared Utilities',
    category: 'Core',
    thresholds: { statements: 60, branches: 35, functions: 45, lines: 60 }
  },
  {
    path: 'packages/frontend',
    name: 'Frontend',
    category: 'UI',
    thresholds: { statements: 25, branches: 20, functions: 30, lines: 25 }
  },
  {
    path: 'packages/api-services/auth-service',
    name: 'Auth Service',
    category: 'API',
    thresholds: { statements: 40, branches: 15, functions: 40, lines: 40 }
  },
  {
    path: 'packages/api-services/user-service',
    name: 'User Service',
    category: 'API',
    thresholds: { statements: 50, branches: 30, functions: 40, lines: 50 }
  },
  {
    path: 'packages/api-services/news-service',
    name: 'News Service',
    category: 'API',
    thresholds: { statements: 50, branches: 30, functions: 40, lines: 50 }
  },
  {
    path: 'packages/api-services/course-service',
    name: 'Course Service',
    category: 'API',
    thresholds: { statements: 50, branches: 30, functions: 40, lines: 50 }
  },
  {
    path: 'packages/api-services/statistics-service',
    name: 'Statistics Service',
    category: 'API',
    thresholds: { statements: 50, branches: 30, functions: 40, lines: 50 }
  },
  {
    path: 'packages/api-services/planning-service',
    name: 'Planning Service',
    category: 'API',
    thresholds: { statements: 50, branches: 30, functions: 40, lines: 50 }
  }
];

/**
 * Read coverage data for a package
 */
function readCoverageData(packagePath) {
  const summaryPath = path.join(__dirname, '..', packagePath, 'coverage/coverage-summary.json');
  
  if (!fs.existsSync(summaryPath)) {
    return null;
  }
  
  try {
    return JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  } catch (error) {
    return null;
  }
}

/**
 * Get coverage status color and symbol
 */
function getCoverageStatus(actual, threshold) {
  const percentage = actual;
  
  if (percentage >= threshold) {
    return { color: colors.green, symbol: '●', status: 'PASS' };
  } else if (percentage >= threshold * 0.8) {
    return { color: colors.yellow, symbol: '◐', status: 'WARN' };
  } else {
    return { color: colors.red, symbol: '○', status: 'FAIL' };
  }
}

/**
 * Format percentage with color
 */
function formatPercentage(value, threshold) {
  const status = getCoverageStatus(value, threshold);
  return `${status.color}${value.toFixed(1)}%${colors.reset}`;
}

/**
 * Create a progress bar
 */
function createProgressBar(percentage, width = 20) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  
  let color;
  if (percentage >= 70) color = colors.green;
  else if (percentage >= 50) color = colors.yellow;
  else color = colors.red;
  
  return `${color}${'█'.repeat(filled)}${colors.dim}${'░'.repeat(empty)}${colors.reset}`;
}

/**
 * Calculate overall statistics
 */
function calculateOverallStats(results) {
  const validResults = results.filter(r => r.coverage !== null);
  
  if (validResults.length === 0) {
    return null;
  }
  
  const totals = {
    statements: 0,
    branches: 0,
    functions: 0,
    lines: 0
  };
  
  // Calculate weighted averages
  let totalLines = 0;
  
  for (const result of validResults) {
    const coverage = result.coverage.total;
    const weight = coverage.lines.total || 1;
    
    totals.statements += coverage.statements.pct * weight;
    totals.branches += coverage.branches.pct * weight;
    totals.functions += coverage.functions.pct * weight;
    totals.lines += coverage.lines.pct * weight;
    totalLines += weight;
  }
  
  return {
    statements: totals.statements / totalLines,
    branches: totals.branches / totalLines,
    functions: totals.functions / totalLines,
    lines: totals.lines / totalLines,
    packagesWithCoverage: validResults.length,
    totalPackages: results.length
  };
}

/**
 * Main function
 */
function main() {
  console.log(`${colors.bold}${colors.blue}📊 Yggdrasil Platform - Coverage Summary Dashboard${colors.reset}\n`);
  
  const results = packages.map(pkg => {
    const coverage = readCoverageData(pkg.path);
    return {
      ...pkg,
      coverage
    };
  });
  
  // Group by category
  const categories = ['Core', 'UI', 'API'];
  
  for (const category of categories) {
    const categoryPackages = results.filter(r => r.category === category);
    
    console.log(`${colors.bold}${colors.cyan}${category} Components:${colors.reset}`);
    console.log('─'.repeat(80));
    
    // Table header
    console.log(
      '  Package'.padEnd(20) +
      'Statements'.padEnd(12) +
      'Branches'.padEnd(12) +
      'Functions'.padEnd(12) +
      'Lines'.padEnd(12) +
      'Coverage'
    );
    console.log('  ' + '─'.repeat(76));
    
    for (const pkg of categoryPackages) {
      if (!pkg.coverage) {
        console.log(`  ${pkg.name.padEnd(18)} ${colors.dim}No coverage data${colors.reset}`);
        continue;
      }
      
      const total = pkg.coverage.total;
      const statements = formatPercentage(total.statements.pct, pkg.thresholds.statements);
      const branches = formatPercentage(total.branches.pct, pkg.thresholds.branches);
      const functions = formatPercentage(total.functions.pct, pkg.thresholds.functions);
      const lines = formatPercentage(total.lines.pct, pkg.thresholds.lines);
      
      const avgCoverage = (total.statements.pct + total.branches.pct + total.functions.pct + total.lines.pct) / 4;
      const progressBar = createProgressBar(avgCoverage);
      
      console.log(
        `  ${pkg.name.padEnd(18)} ` +
        `${statements.padEnd(20)} ` +
        `${branches.padEnd(20)} ` +
        `${functions.padEnd(20)} ` +
        `${lines.padEnd(20)} ` +
        `${progressBar}`
      );
    }
    
    console.log();
  }
  
  // Overall statistics
  const overallStats = calculateOverallStats(results);
  
  if (overallStats) {
    console.log(`${colors.bold}${colors.magenta}📈 Overall Platform Coverage:${colors.reset}`);
    console.log('─'.repeat(50));
    
    const metrics = [
      { name: 'Statements', value: overallStats.statements },
      { name: 'Branches', value: overallStats.branches },
      { name: 'Functions', value: overallStats.functions },
      { name: 'Lines', value: overallStats.lines }
    ];
    
    for (const metric of metrics) {
      const bar = createProgressBar(metric.value, 25);
      console.log(`  ${metric.name.padEnd(12)} ${metric.value.toFixed(1)}%`.padEnd(20) + ` ${bar}`);
    }
    
    console.log();
    console.log(`${colors.bold}📦 Package Coverage:${colors.reset}`);
    console.log(`  • Packages with coverage: ${colors.green}${overallStats.packagesWithCoverage}${colors.reset}/${overallStats.totalPackages}`);
    console.log(`  • Coverage completeness: ${formatPercentage((overallStats.packagesWithCoverage / overallStats.totalPackages) * 100, 100)}`);
  }
  
  // Coverage improvement suggestions
  console.log(`\n${colors.bold}💡 Coverage Improvement Opportunities:${colors.reset}`);
  
  const lowCoveragePackages = results
    .filter(r => r.coverage)
    .filter(r => {
      const total = r.coverage.total;
      const avg = (total.statements.pct + total.branches.pct + total.functions.pct + total.lines.pct) / 4;
      return avg < 50; // Below 50% average
    })
    .sort((a, b) => {
      const avgA = (a.coverage.total.statements.pct + a.coverage.total.branches.pct + a.coverage.total.functions.pct + a.coverage.total.lines.pct) / 4;
      const avgB = (b.coverage.total.statements.pct + b.coverage.total.branches.pct + b.coverage.total.functions.pct + b.coverage.total.lines.pct) / 4;
      return avgA - avgB;
    });
  
  if (lowCoveragePackages.length > 0) {
    console.log(`  🎯 Focus on these packages first:`);
    for (const pkg of lowCoveragePackages.slice(0, 3)) {
      const total = pkg.coverage.total;
      const avg = (total.statements.pct + total.branches.pct + total.functions.pct + total.lines.pct) / 4;
      console.log(`     • ${pkg.name}: ${avg.toFixed(1)}% average coverage`);
    }
  } else {
    console.log(`  🎉 Great job! All packages have decent coverage.`);
  }
  
  console.log(`\n${colors.dim}Generated: ${new Date().toLocaleString()}${colors.reset}`);
  console.log(`${colors.dim}Run 'npm run test:coverage' to update coverage data${colors.reset}`);
}

if (require.main === module) {
  main();
}

module.exports = { main, readCoverageData, calculateOverallStats };