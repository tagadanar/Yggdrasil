#!/usr/bin/env node

/**
 * Script to check for navbar duplication issues in page components
 * This script ensures that pages don't wrap their content with Layout components
 * since RootLayoutContent already handles layout logic automatically.
 */

const fs = require('fs');
const path = require('path');

const PAGE_DIR = path.join(__dirname, '../src/app');
const PROBLEMATIC_PATTERNS = [
  /import\s+.*Layout.*from\s+['"]@\/components\/layout\/Layout['"];?/,
  /<Layout>/,
  /<Layout\s+[^>]*>/
];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  PROBLEMATIC_PATTERNS.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      switch (index) {
        case 0:
          issues.push('Imports Layout component (should be removed)');
          break;
        case 1:
        case 2:
          issues.push('Uses <Layout> wrapper (should be removed)');
          break;
      }
    }
  });

  return issues;
}

function scanPages(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      scanPages(fullPath, results);
    } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
      // Skip auth-related pages that shouldn't have layout
      const relativePath = path.relative(PAGE_DIR, fullPath);
      if (relativePath.includes('login') || relativePath.includes('register')) {
        continue;
      }

      const issues = checkFile(fullPath);
      if (issues.length > 0) {
        results.push({
          file: relativePath,
          issues: issues
        });
      }
    }
  }

  return results;
}

function main() {
  console.log('🔍 Checking for navbar duplication issues...\n');

  try {
    const results = scanPages(PAGE_DIR);

    if (results.length === 0) {
      console.log('✅ No navbar duplication issues found!');
      console.log('   All pages properly delegate layout to RootLayoutContent.\n');
      return 0;
    }

    console.log('❌ Found navbar duplication issues:\n');

    results.forEach(result => {
      console.log(`   📄 ${result.file}:`);
      result.issues.forEach(issue => {
        console.log(`      • ${issue}`);
      });
      console.log('');
    });

    console.log('🛠️  To fix these issues:');
    console.log('   1. Remove Layout import from page components');
    console.log('   2. Remove <Layout> wrapper from page components');
    console.log('   3. Let RootLayoutContent handle layout automatically');
    console.log('   4. Wrap content only with <ProtectedRoute> for auth\n');

    console.log('📖 Example fix:');
    console.log('   ❌ Before:');
    console.log('   ```tsx');
    console.log('   import Layout from "@/components/layout/Layout";');
    console.log('   ');
    console.log('   export default function MyPage() {');
    console.log('     return (');
    console.log('       <ProtectedRoute>');
    console.log('         <Layout>');
    console.log('           <MyComponent />');
    console.log('         </Layout>');
    console.log('       </ProtectedRoute>');
    console.log('     );');
    console.log('   }');
    console.log('   ```\n');
    console.log('   ✅ After:');
    console.log('   ```tsx');
    console.log('   export default function MyPage() {');
    console.log('     return (');
    console.log('       <ProtectedRoute>');
    console.log('         <MyComponent />');
    console.log('       </ProtectedRoute>');
    console.log('     );');
    console.log('   }');
    console.log('   ```\n');

    return 1;
  } catch (error) {
    console.error('❌ Error checking for navbar duplication:', error.message);
    return 1;
  }
}

process.exit(main());