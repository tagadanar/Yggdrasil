#!/usr/bin/env node

/**
 * Intelligent TypeScript checking for pre-commit hooks
 * Only checks packages that contain staged TypeScript files
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get staged TypeScript files
function getStagedTsFiles() {
  try {
    const staged = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf8',
      cwd: process.cwd(),
    }).trim();

    if (!staged) return [];

    return staged
      .split('\n')
      .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'))
      .filter(file => !file.includes('node_modules'))
      .filter(file => !file.endsWith('.d.ts'));
  } catch (error) {
    console.log('⚠️ Could not get staged files, checking all packages');
    return null;
  }
}

// Determine affected packages from staged files
function getAffectedPackages(stagedFiles) {
  if (!stagedFiles || stagedFiles.length === 0) {
    return [];
  }

  const packages = new Set();

  for (const file of stagedFiles) {
    // Match package paths
    if (file.startsWith('packages/api-services/')) {
      const serviceName = file.split('/')[2];
      packages.add(`@yggdrasil/${serviceName}`);
    } else if (file.startsWith('packages/frontend/')) {
      packages.add('@yggdrasil/frontend');
    } else if (file.startsWith('packages/database-schemas/')) {
      packages.add('@yggdrasil/database-schemas');
    } else if (file.startsWith('packages/shared-utilities/')) {
      packages.add('@yggdrasil/shared-utilities');
    } else if (file.startsWith('packages/testing-utilities/')) {
      packages.add('@yggdrasil/testing-utilities');
    }
  }

  return Array.from(packages);
}

// Check if package exists and has typecheck script
function hasTypecheckScript(packageName) {
  try {
    const packagePath = packageName.replace('@yggdrasil/', 'packages/');
    if (packageName === '@yggdrasil/frontend') {
      packagePath = 'packages/frontend';
    } else if (packageName === '@yggdrasil/database-schemas') {
      packagePath = 'packages/database-schemas';
    } else if (packageName === '@yggdrasil/shared-utilities') {
      packagePath = 'packages/shared-utilities';
    } else if (packageName === '@yggdrasil/testing-utilities') {
      packagePath = 'packages/testing-utilities';
    }

    const packageJsonPath = path.join(process.cwd(), packagePath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return !!(packageJson.scripts && packageJson.scripts.typecheck);
  } catch (error) {
    return false;
  }
}

// Run typecheck for specific packages
function runTypecheckForPackages(packages) {
  console.log(`🔍 Running TypeScript check for ${packages.length} package(s)...`);

  let hasErrors = false;

  for (const pkg of packages) {
    if (!hasTypecheckScript(pkg)) {
      console.log(`⚠️ Skipping ${pkg} (no typecheck script)`);
      continue;
    }

    console.log(`📦 Checking ${pkg}...`);

    try {
      execSync(`npm run typecheck --workspace=${pkg}`, {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      console.log(`✅ ${pkg} typecheck passed`);
    } catch (error) {
      console.log(`❌ ${pkg} typecheck failed`);
      hasErrors = true;
    }
  }

  return !hasErrors;
}

// Main execution
function main() {
  // Check for emergency bypass
  if (process.env.SKIP_TYPECHECK === 'true') {
    console.log('⚠️ TypeScript checking skipped (SKIP_TYPECHECK=true)');
    process.exit(0);
  }

  console.log('🔍 Analyzing staged TypeScript files...');

  const stagedFiles = getStagedTsFiles();

  if (!stagedFiles || stagedFiles.length === 0) {
    console.log('✅ No TypeScript files staged, skipping typecheck');
    process.exit(0);
  }

  console.log(`📄 Found ${stagedFiles.length} staged TypeScript file(s)`);

  const affectedPackages = getAffectedPackages(stagedFiles);

  if (affectedPackages.length === 0) {
    console.log('✅ No packages affected, skipping typecheck');
    process.exit(0);
  }

  const success = runTypecheckForPackages(affectedPackages);

  if (!success) {
    console.log('\n❌ TypeScript checking failed!');
    console.log('\n💡 To bypass typecheck for urgent fixes:');
    console.log('   SKIP_TYPECHECK=true git commit -m "urgent: your message"');
    process.exit(1);
  }

  console.log('\n✅ All TypeScript checks passed!');
  process.exit(0);
}

main();
