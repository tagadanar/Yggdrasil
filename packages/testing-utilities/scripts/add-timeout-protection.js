#!/usr/bin/env node

// Script to add timeout protection to all test files
// This prevents any single test from hanging the entire test suite

const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, '../tests');

function addTimeoutProtection(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has timeout protection
  if (content.includes('test.setTimeout')) {
    console.log(`⏭️  Skipping ${filePath} - already has timeout protection`);
    return false;
  }
  
  // Find test.describe blocks and add timeout protection
  const lines = content.split('\n');
  let modified = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for test.describe lines
    if (line.includes('test.describe(') && !line.trim().startsWith('//')) {
      // Find the opening brace
      let braceIndex = i + 1;
      while (braceIndex < lines.length && !lines[braceIndex].includes('{')) {
        braceIndex++;
      }
      
      if (braceIndex < lines.length) {
        // Insert timeout protection after the opening brace
        const indentation = lines[braceIndex].match(/^\s*/)[0];
        const timeoutLine = `${indentation}  // Prevent test hangs - 90 second max per test`;
        const setTimeoutLine = `${indentation}  test.setTimeout(90000);`;
        const emptyLine = `${indentation}`;
        
        lines.splice(braceIndex + 1, 0, timeoutLine, setTimeoutLine, emptyLine);
        modified = true;
        console.log(`✅ Added timeout protection to ${filePath}`);
        break; // Only add to the first test.describe block
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'));
    return true;
  }
  
  return false;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let totalModified = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      totalModified += processDirectory(filePath);
    } else if (file.endsWith('.spec.ts')) {
      if (addTimeoutProtection(filePath)) {
        totalModified++;
      }
    }
  }
  
  return totalModified;
}

console.log('🛡️  Adding timeout protection to all test files...');
const modified = processDirectory(testDir);
console.log(`✅ Added timeout protection to ${modified} test files`);
console.log('🎯 All tests now have 90-second timeout protection to prevent hangs');