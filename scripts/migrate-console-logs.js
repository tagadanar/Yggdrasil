#!/usr/bin/env node

/**
 * Console.log Migration Script for Yggdrasil Platform
 * 
 * Intelligently replaces console.* statements with proper Winston logging
 * from @yggdrasil/shared-utilities while preserving message context and format.
 * 
 * Features:
 * - Context-aware log level mapping
 * - Automatic logger import injection
 * - Preserves message formatting and variables
 * - Handles console.log, console.error, console.warn, console.info
 * - Respects test files (preserves console in tests)
 * - Creates backup of original files
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  // Directories to process
  includeDirs: [
    'packages/api-services',
    'packages/shared-utilities/src',
    'packages/database-schemas/src'
  ],
  
  // Files to exclude (preserve console in tests)
  excludePatterns: [
    /\.test\.ts$/,
    /\.spec\.ts$/,
    /\/tests?\//,
    /__tests?__/,
    /\/dist\//,
    /\/node_modules\//
  ],
  
  // Extensions to process
  extensions: ['.ts', '.tsx'],
  
  // Backup directory
  backupDir: './console-migration-backup'
};

/**
 * Context-aware log level mapping based on message content
 */
const LOG_LEVEL_PATTERNS = {
  error: [
    /error/i,
    /failed/i,
    /exception/i,
    /❌/,
    /✗/,
    /crash/i,
    /abort/i
  ],
  warn: [
    /warn/i,
    /warning/i,
    /⚠️/,
    /deprecated/i,
    /fallback/i,
    /timeout/i
  ],
  info: [
    /✅/,
    /🎉/,
    /success/i,
    /complete/i,
    /ready/i,
    /starting/i,
    /listening/i,
    /connected/i
  ],
  debug: [
    /🔧/,
    /debug/i,
    /config/i,
    /environment/i,
    /received/i,
    /worker/i,
    /port/i
  ]
};

/**
 * Determine appropriate log level based on message content
 */
function determineLogLevel(originalMethod, message) {
  // Override based on original console method
  if (originalMethod === 'console.error') return 'error';
  if (originalMethod === 'console.warn') return 'warn';
  if (originalMethod === 'console.info') return 'info';
  
  // Analyze message content for console.log
  const lowerMessage = message.toLowerCase();
  
  for (const [level, patterns] of Object.entries(LOG_LEVEL_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(lowerMessage))) {
      return level;
    }
  }
  
  // Default to info for console.log
  return 'info';
}

/**
 * Extract and clean the message content from console statement
 */
function extractMessage(consoleStatement) {
  // Match console.method(args)
  const match = consoleStatement.match(/console\.\w+\((.+)\)[\s;]*$/);
  if (!match) return consoleStatement;
  
  return match[1].trim();
}

/**
 * Check if file needs logger import
 */
function needsLoggerImport(content) {
  return !content.includes("import { logger }") && 
         !content.includes("from '@yggdrasil/shared-utilities'");
}

/**
 * Add logger import to file
 */
function addLoggerImport(content) {
  // Find existing imports from shared-utilities
  const sharedUtilsImportRegex = /import\s*{([^}]+)}\s*from\s*['"]@yggdrasil\/shared-utilities['"];?/;
  const match = content.match(sharedUtilsImportRegex);
  
  if (match) {
    // Add logger to existing import
    const existingImports = match[1];
    if (!existingImports.includes('logger')) {
      const newImports = existingImports.trim() + ', logger';
      content = content.replace(sharedUtilsImportRegex, 
        `import { ${newImports} } from '@yggdrasil/shared-utilities';`);
    }
  } else {
    // Add new import at the top (after other imports)
    const lastImportRegex = /^import\s+.*?;$/gm;
    const imports = content.match(lastImportRegex);
    
    if (imports) {
      const lastImport = imports[imports.length - 1];
      const insertIndex = content.indexOf(lastImport) + lastImport.length;
      content = content.slice(0, insertIndex) + 
                "\nimport { logger } from '@yggdrasil/shared-utilities';" +
                content.slice(insertIndex);
    } else {
      // No imports found, add at the beginning
      content = "import { logger } from '@yggdrasil/shared-utilities';\n\n" + content;
    }
  }
  
  return content;
}

/**
 * Transform console statements to proper logging
 */
function transformConsoleStatements(content) {
  const lines = content.split('\n');
  const transformedLines = [];
  let modified = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const consoleMatch = line.match(/^(\s*)(console\.(log|error|warn|info))\((.+)\)([\s;]*)$/);
    
    if (consoleMatch) {
      const [, indent, originalMethod, method, args, suffix] = consoleMatch;
      const message = args;
      const level = determineLogLevel(originalMethod, message);
      
      // Transform to logger statement
      const transformedLine = `${indent}logger.${level}(${message})${suffix}`;
      transformedLines.push(transformedLine);
      modified = true;
      
      console.log(`  ✅ ${originalMethod}(...) → logger.${level}(...)`);
    } else {
      transformedLines.push(line);
    }
  }
  
  return { content: transformedLines.join('\n'), modified };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    console.log(`\n🔄 Processing: ${filePath}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let totalModifications = 0;
    
    // Count console statements
    const consoleCount = (content.match(/console\.(log|error|warn|info)/g) || []).length;
    if (consoleCount === 0) {
      console.log(`  ℹ️  No console statements found`);
      return 0;
    }
    
    console.log(`  📊 Found ${consoleCount} console statements`);
    
    // Transform console statements
    const { content: transformedContent, modified } = transformConsoleStatements(content);
    
    if (modified) {
      // Add logger import if needed
      let finalContent = transformedContent;
      if (needsLoggerImport(finalContent)) {
        finalContent = addLoggerImport(finalContent);
        console.log(`  📦 Added logger import`);
      }
      
      // Write the file
      fs.writeFileSync(filePath, finalContent, 'utf8');
      totalModifications = consoleCount;
      console.log(`  ✅ Updated ${totalModifications} console statements`);
    }
    
    return totalModifications;
  } catch (error) {
    console.error(`  ❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

/**
 * Create backup of files before migration
 */
function createBackup() {
  console.log(`📦 Creating backup in ${CONFIG.backupDir}...`);
  
  if (fs.existsSync(CONFIG.backupDir)) {
    execSync(`rm -rf ${CONFIG.backupDir}`);
  }
  
  fs.mkdirSync(CONFIG.backupDir, { recursive: true });
  
  for (const dir of CONFIG.includeDirs) {
    const fullPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(fullPath)) {
      const backupPath = path.join(CONFIG.backupDir, dir);
      execSync(`mkdir -p "${path.dirname(backupPath)}" && cp -r "${fullPath}" "${backupPath}"`);
    }
  }
  
  console.log(`✅ Backup created successfully`);
}

/**
 * Find all TypeScript files to process
 */
function findFilesToProcess() {
  const files = [];
  
  for (const dir of CONFIG.includeDirs) {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) continue;
    
    function scanDirectory(currentPath) {
      const items = fs.readdirSync(currentPath);
      
      for (const item of items) {
        const itemPath = path.join(currentPath, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          if (!CONFIG.excludePatterns.some(pattern => pattern.test(itemPath))) {
            scanDirectory(itemPath);
          }
        } else if (stat.isFile()) {
          if (CONFIG.extensions.some(ext => item.endsWith(ext)) &&
              !CONFIG.excludePatterns.some(pattern => pattern.test(itemPath))) {
            files.push(itemPath);
          }
        }
      }
    }
    
    scanDirectory(fullPath);
  }
  
  return files;
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Console.log Migration Script');
  console.log('================================');
  console.log(`Target directories: ${CONFIG.includeDirs.join(', ')}`);
  console.log(`Backup directory: ${CONFIG.backupDir}`);
  
  // Create backup
  createBackup();
  
  // Find files to process
  const files = findFilesToProcess();
  console.log(`\n📁 Found ${files.length} files to process`);
  
  if (files.length === 0) {
    console.log('No files found to process');
    return;
  }
  
  // Process files
  let totalFiles = 0;
  let totalModifications = 0;
  
  for (const file of files) {
    const modifications = processFile(file);
    if (modifications > 0) {
      totalFiles++;
      totalModifications += modifications;
    }
  }
  
  // Summary
  console.log('\n📊 Migration Summary:');
  console.log(`   Files processed: ${totalFiles}/${files.length}`);
  console.log(`   Console statements migrated: ${totalModifications}`);
  console.log(`   Backup created: ${CONFIG.backupDir}`);
  
  if (totalModifications > 0) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Review the changes with: git diff');
    console.log('   2. Test the application: npm run test:single');
    console.log('   3. Commit the changes: git add . && git commit -m "refactor: migrate console statements to Winston logger"');
    console.log(`   4. Remove backup if satisfied: rm -rf ${CONFIG.backupDir}`);
  } else {
    console.log('\n✨ No console statements found to migrate');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { processFile, determineLogLevel, extractMessage };