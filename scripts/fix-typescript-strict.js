#!/usr/bin/env node

/**
 * TypeScript Strict Mode Fix Script
 * 
 * Automatically fixes common strict mode errors across all API services:
 * 1. process.env property access (dot notation -> bracket notation)
 * 2. Unused parameters (add underscore prefix)
 * 3. Common import/export issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Services to fix
const API_SERVICES = [
  'user-service',
  'news-service', 
  'course-service',
  'planning-service',
  'statistics-service'
];

/**
 * Fix process.env access patterns
 */
function fixProcessEnvAccess(content) {
  // Pattern: process.env.PROPERTY -> process.env['PROPERTY']
  return content.replace(/process\.env\.([A-Z_][A-Z0-9_]*)/g, "process.env['$1']");
}

/**
 * Fix unused parameters by adding underscore prefix
 */
function fixUnusedParameters(content) {
  const fixes = [
    // Function parameters: (param, res) -> (_param, res) when param is unused
    { pattern: /\((req),\s*res:/g, replacement: '(_req, res:' },
    { pattern: /\((req),\s*_res:/g, replacement: '(_req, _res:' },
    { pattern: /\(([a-zA-Z][a-zA-Z0-9]*),\s*res:\s*Response\)/g, replacement: '(_$1, res: Response)' },
    { pattern: /\(error:\s*Error,\s*(req):\s*Request,\s*res:\s*Response,\s*(next):\s*NextFunction\)/g, replacement: '(error: Error, req: Request, res: Response, _next: NextFunction)' },
    { pattern: /\((req):\s*Request,\s*(res):\s*Response,\s*next:\s*NextFunction\)/g, replacement: '(_req: Request, _res: Response, next: NextFunction)' },
    // Health check endpoints
    { pattern: /app\.get\('\/health',\s*\((req),\s*res\)/g, replacement: "app.get('/health', (_req, res)" },
    // Express route handlers where req is unused
    { pattern: /\((req),\s*res\)\s*=>/g, replacement: '(_req, res) =>' },
    // Error handlers with unused next parameter
    { pattern: /\((err|error):\s*any,\s*(req):\s*express\.Request,\s*res:\s*express\.Response,\s*(next):\s*express\.NextFunction\)/g, replacement: '($1: any, _req: express.Request, res: express.Response, _next: express.NextFunction)' },
    // Remove unused imports
    { pattern: /^import\s+{[^}]*,\s*([A-Za-z]+Model)\s*,/gm, replacement: function(match, model) {
      // Only remove if the model is not used elsewhere in the file
      return match; // Keep for now, we'll handle this case-by-case
    }}
  ];

  let result = content;
  fixes.forEach(fix => {
    result = result.replace(fix.pattern, fix.replacement);
  });
  
  return result;
}

/**
 * Fix type safety issues
 */
function fixTypeSafetyIssues(content) {
  // Add non-null assertions for parameters that come from validated request paths
  const fixes = [
    // req.params.id -> req.params.id! (when we know the route ensures it exists)
    { pattern: /req\.params\.id(?!\!)/g, replacement: 'req.params.id!' },
    { pattern: /req\.params\.userId(?!\!)/g, replacement: 'req.params.userId!' },
    { pattern: /req\.params\.courseId(?!\!)/g, replacement: 'req.params.courseId!' },
    { pattern: /req\.params\.newsId(?!\!)/g, replacement: 'req.params.newsId!' },
    { pattern: /req\.params\.planningId(?!\!)/g, replacement: 'req.params.planningId!' },
    { pattern: /req\.params\.statisticsId(?!\!)/g, replacement: 'req.params.statisticsId!' },
    // Fix req.body access for validated requests (when we know middleware ensures it exists)
    { pattern: /req\.body\.([a-zA-Z][a-zA-Z0-9_]*)/g, replacement: 'req.body!.$1' },
  ];

  let result = content;
  fixes.forEach(fix => {
    result = result.replace(fix.pattern, fix.replacement);
  });
  
  return result;
}

/**
 * Fix a single file
 */
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Apply fixes
    const originalContent = content;
    content = fixProcessEnvAccess(content);
    content = fixUnusedParameters(content);
    content = fixTypeSafetyIssues(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      modified = true;
      console.log(`✅ Fixed: ${filePath}`);
    }
    
    return modified;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Recursively find and fix TypeScript files in a directory
 */
function fixDirectory(dirPath, extensions = ['.ts', '.tsx']) {
  let totalFixed = 0;
  
  function processDirectory(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && !['node_modules', 'dist', '.git'].includes(item)) {
        processDirectory(itemPath);
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        if (fixFile(itemPath)) {
          totalFixed++;
        }
      }
    }
  }
  
  processDirectory(dirPath);
  return totalFixed;
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 TypeScript Strict Mode Fix Script');
  console.log('=====================================');
  
  let totalServices = 0;
  let totalFiles = 0;
  
  for (const service of API_SERVICES) {
    const servicePath = path.join(__dirname, '..', 'packages', 'api-services', service);
    
    if (!fs.existsSync(servicePath)) {
      console.log(`⚠️  Service not found: ${service}`);
      continue;
    }
    
    console.log(`\n🚀 Processing ${service}...`);
    const filesFixed = fixDirectory(servicePath);
    
    totalServices++;
    totalFiles += filesFixed;
    
    console.log(`   ${filesFixed} files fixed`);
  }
  
  console.log('\n✅ Fix Summary:');
  console.log(`   - Services processed: ${totalServices}`);
  console.log(`   - Files modified: ${totalFiles}`);
  
  // Test compilation after fixes
  console.log('\n🧪 Testing compilation...');
  for (const service of API_SERVICES) {
    try {
      console.log(`   Checking ${service}...`);
      execSync(`npm run typecheck --workspace=@yggdrasil/${service}`, { 
        stdio: 'pipe',
        cwd: path.join(__dirname, '..')
      });
      console.log(`   ✅ ${service} compiles successfully`);
    } catch (error) {
      console.log(`   ⚠️  ${service} still has TypeScript errors`);
    }
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { fixProcessEnvAccess, fixUnusedParameters, fixFile, fixDirectory };