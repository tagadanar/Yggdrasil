#!/usr/bin/env node

/**
 * Coverage Report Merger
 * Merges coverage reports from all packages into a unified report
 */

const fs = require('fs');
const path = require('path');

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

/**
 * Read coverage data from a package
 */
function readPackageCoverage(packagePath) {
  const summaryPath = path.join(__dirname, '..', packagePath, 'coverage/coverage-summary.json');
  const finalPath = path.join(__dirname, '..', packagePath, 'coverage/coverage-final.json');
  
  let summary = null;
  let final = null;
  
  if (fs.existsSync(summaryPath)) {
    try {
      summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    } catch (error) {
      console.warn(`Warning: Could not read ${summaryPath}:`, error.message);
    }
  }
  
  if (fs.existsSync(finalPath)) {
    try {
      final = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
    } catch (error) {
      console.warn(`Warning: Could not read ${finalPath}:`, error.message);
    }
  }
  
  return { summary, final };
}

/**
 * Merge coverage metrics
 */
function mergeCoverageMetrics(target, source, packageName) {
  if (!source) return;
  
  // Merge file-level coverage
  if (source && typeof source === 'object') {
    for (const [filePath, fileData] of Object.entries(source)) {
      if (filePath === 'total') continue;
      
      // Prefix file paths with package name to avoid conflicts
      const prefixedPath = path.join(packageName, filePath);
      target[prefixedPath] = fileData;
    }
  }
}

/**
 * Calculate totals from merged data
 */
function calculateTotals(mergedData) {
  let totalStatements = { total: 0, covered: 0, skipped: 0, pct: 0 };
  let totalFunctions = { total: 0, covered: 0, skipped: 0, pct: 0 };
  let totalBranches = { total: 0, covered: 0, skipped: 0, pct: 0 };
  let totalLines = { total: 0, covered: 0, skipped: 0, pct: 0 };
  
  for (const [filePath, fileData] of Object.entries(mergedData)) {
    if (filePath === 'total' || !fileData || typeof fileData !== 'object') continue;
    
    if (fileData.statements) {
      totalStatements.total += fileData.statements.total || 0;
      totalStatements.covered += fileData.statements.covered || 0;
      totalStatements.skipped += fileData.statements.skipped || 0;
    }
    
    if (fileData.functions) {
      totalFunctions.total += fileData.functions.total || 0;
      totalFunctions.covered += fileData.functions.covered || 0;
      totalFunctions.skipped += fileData.functions.skipped || 0;
    }
    
    if (fileData.branches) {
      totalBranches.total += fileData.branches.total || 0;
      totalBranches.covered += fileData.branches.covered || 0;
      totalBranches.skipped += fileData.branches.skipped || 0;
    }
    
    if (fileData.lines) {
      totalLines.total += fileData.lines.total || 0;
      totalLines.covered += fileData.lines.covered || 0;
      totalLines.skipped += fileData.lines.skipped || 0;
    }
  }
  
  // Calculate percentages
  totalStatements.pct = totalStatements.total > 0 ? (totalStatements.covered / totalStatements.total) * 100 : 0;
  totalFunctions.pct = totalFunctions.total > 0 ? (totalFunctions.covered / totalFunctions.total) * 100 : 0;
  totalBranches.pct = totalBranches.total > 0 ? (totalBranches.covered / totalBranches.total) * 100 : 0;
  totalLines.pct = totalLines.total > 0 ? (totalLines.covered / totalLines.total) * 100 : 0;
  
  return {
    statements: totalStatements,
    functions: totalFunctions,
    branches: totalBranches,
    lines: totalLines
  };
}

/**
 * Main merge function
 */
function main() {
  console.log('🔄 Merging coverage reports from all packages...\n');
  
  const mergedSummary = {};
  const mergedFinal = {};
  
  let packagesProcessed = 0;
  let packagesWithCoverage = 0;
  
  // Process each package
  for (const packagePath of packages) {
    const packageName = path.basename(packagePath);
    console.log(`📦 Processing ${packageName}...`);
    
    const coverage = readPackageCoverage(packagePath);
    packagesProcessed++;
    
    if (coverage.summary || coverage.final) {
      packagesWithCoverage++;
      
      // Merge summary data
      if (coverage.summary) {
        mergeCoverageMetrics(mergedSummary, coverage.summary, packageName);
      }
      
      // Merge final data
      if (coverage.final) {
        mergeCoverageMetrics(mergedFinal, coverage.final, packageName);
      }
      
      console.log(`   ✅ Merged coverage data`);
    } else {
      console.log(`   ⚠️  No coverage data found`);
    }
  }
  
  if (packagesWithCoverage === 0) {
    console.log('\n❌ No coverage data found in any package. Run tests with coverage first:');
    console.log('   npm run test:coverage');
    process.exit(1);
  }
  
  // Calculate merged totals
  const mergedTotals = calculateTotals(mergedSummary);
  mergedSummary.total = mergedTotals;
  
  // Create output directory
  const outputDir = path.join(__dirname, '..', 'coverage-merged');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write merged reports
  const summaryPath = path.join(outputDir, 'coverage-summary.json');
  const finalPath = path.join(outputDir, 'coverage-final.json');
  
  fs.writeFileSync(summaryPath, JSON.stringify(mergedSummary, null, 2));
  console.log(`📄 Merged summary written to: ${summaryPath}`);
  
  if (Object.keys(mergedFinal).length > 0) {
    fs.writeFileSync(finalPath, JSON.stringify(mergedFinal, null, 2));
    console.log(`📄 Merged final report written to: ${finalPath}`);
  }
  
  // Create HTML report index
  const htmlIndex = `
<!DOCTYPE html>
<html>
<head>
  <title>Yggdrasil Platform - Merged Coverage Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #2c3e50; }
    .stats { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .metric { margin: 10px 0; }
    .metric-label { font-weight: bold; display: inline-block; width: 120px; }
    .metric-value { color: #27ae60; }
    .links { margin: 30px 0; }
    .links a { margin-right: 20px; padding: 10px 15px; background: #3498db; color: white; text-decoration: none; border-radius: 4px; }
    .links a:hover { background: #2980b9; }
  </style>
</head>
<body>
  <h1>🌳 Yggdrasil Platform - Merged Coverage Report</h1>
  
  <div class="stats">
    <h2>Overall Coverage Statistics</h2>
    <div class="metric">
      <span class="metric-label">Statements:</span>
      <span class="metric-value">${mergedTotals.statements.pct.toFixed(2)}%</span>
      (${mergedTotals.statements.covered}/${mergedTotals.statements.total})
    </div>
    <div class="metric">
      <span class="metric-label">Branches:</span>
      <span class="metric-value">${mergedTotals.branches.pct.toFixed(2)}%</span>
      (${mergedTotals.branches.covered}/${mergedTotals.branches.total})
    </div>
    <div class="metric">
      <span class="metric-label">Functions:</span>
      <span class="metric-value">${mergedTotals.functions.pct.toFixed(2)}%</span>
      (${mergedTotals.functions.covered}/${mergedTotals.functions.total})
    </div>
    <div class="metric">
      <span class="metric-label">Lines:</span>
      <span class="metric-value">${mergedTotals.lines.pct.toFixed(2)}%</span>
      (${mergedTotals.lines.covered}/${mergedTotals.lines.total})
    </div>
  </div>
  
  <div class="links">
    <a href="../packages/shared-utilities/coverage/lcov-report/index.html">Shared Utilities Coverage</a>
    <a href="../packages/frontend/coverage/lcov-report/index.html">Frontend Coverage</a>
    <a href="../packages/api-services/auth-service/coverage/lcov-report/index.html">Auth Service Coverage</a>
  </div>
  
  <p><em>Generated: ${new Date().toLocaleString()}</em></p>
  <p><em>Packages processed: ${packagesWithCoverage}/${packagesProcessed}</em></p>
</body>
</html>`;
  
  const htmlPath = path.join(outputDir, 'index.html');
  fs.writeFileSync(htmlPath, htmlIndex);
  console.log(`📊 HTML report written to: ${htmlPath}`);
  
  // Summary
  console.log(`\n✅ Coverage merge complete!`);
  console.log(`   📈 Overall coverage: ${mergedTotals.statements.pct.toFixed(1)}% statements`);
  console.log(`   📦 Packages merged: ${packagesWithCoverage}/${packagesProcessed}`);
  console.log(`   📂 Output directory: ${outputDir}`);
  
  console.log(`\n🌐 Open the HTML report:`);
  console.log(`   file://${path.resolve(htmlPath)}`);
}

if (require.main === module) {
  main();
}

module.exports = { main, readPackageCoverage, mergeCoverageMetrics };