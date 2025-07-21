#!/usr/bin/env node

/**
 * Frontend Testid Validation Script
 * Validates that critical testid attributes are present for test automation
 * Enhanced version of quick-testid-check.js with better error handling and reporting
 */

const { chromium } = require('playwright');
const axios = require('axios');

class TestidValidator {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.headless = options.headless !== false; // Default to headless
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🚀 Initializing testid validator...');
    
    // Check if frontend is running
    try {
      await axios.get(this.baseUrl, { timeout: 5000 });
      console.log('✅ Frontend service is running');
    } catch (error) {
      throw new Error(`Frontend not accessible at ${this.baseUrl}: ${error.message}`);
    }

    this.browser = await chromium.launch({ headless: this.headless });
    this.page = await this.browser.newPage();
  }

  async validateLoginPage() {
    console.log('\n🔐 Validating login page testids...');
    
    try {
      await this.page.goto(`${this.baseUrl}/auth/login`);
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
    } catch (error) {
      throw new Error(`Failed to load login page: ${error.message}`);
    }

    const loginTestids = [
      { id: 'login-form', description: 'Main login form container' },
      { id: 'email-input', description: 'Email input field' },
      { id: 'password-input', description: 'Password input field' },
      { id: 'login-button', description: 'Manual login button' },
      { id: 'demo-admin-button', description: 'Demo admin login button' },
      { id: 'demo-teacher-button', description: 'Demo teacher login button' },
      { id: 'demo-staff-button', description: 'Demo staff login button' },
      { id: 'demo-student-button', description: 'Demo student login button' }
    ];

    const results = [];
    for (const testid of loginTestids) {
      const element = await this.page.locator(`[data-testid="${testid.id}"]`);
      const count = await element.count();
      const found = count > 0;
      
      results.push({ ...testid, found, count });
      console.log(`  ${found ? '✅' : '❌'} ${testid.id}: ${found ? 'FOUND' : 'MISSING'} - ${testid.description}`);
    }

    return results;
  }

  async attemptDemoLogin() {
    console.log('\n🔐 Attempting demo admin login...');
    
    try {
      const demoButton = this.page.locator('[data-testid="demo-admin-button"]');
      if (await demoButton.count() === 0) {
        throw new Error('Demo admin button not found');
      }

      await demoButton.click();
      
      // Wait for navigation with proper condition
      await this.page.waitForFunction(
        () => !window.location.pathname.includes('/auth/login'),
        { timeout: 15000 }
      );

      const currentUrl = this.page.url();
      console.log(`✅ Successfully logged in, redirected to: ${currentUrl}`);
      return currentUrl;
      
    } catch (error) {
      console.log(`⚠️ Demo login failed: ${error.message}`);
      return null;
    }
  }

  async validateNavigation() {
    console.log('\n🧭 Validating navigation testids...');
    
    const navTestids = [
      { id: 'sidebar-nav', description: 'Main sidebar navigation' },
      { id: 'nav-news', description: 'News navigation link' },
      { id: 'nav-users', description: 'Users navigation link' },
      { id: 'nav-courses', description: 'Courses navigation link' },
      { id: 'nav-planning', description: 'Planning navigation link' },
      { id: 'nav-statistics', description: 'Statistics navigation link' }
    ];

    const results = [];
    for (const testid of navTestids) {
      const element = await this.page.locator(`[data-testid="${testid.id}"]`);
      const count = await element.count();
      const found = count > 0;
      
      results.push({ ...testid, found, count });
      console.log(`  ${found ? '✅' : '❌'} ${testid.id}: ${found ? 'FOUND' : 'MISSING'} - ${testid.description}`);
    }

    return results;
  }

  async validateUserManagementPage() {
    console.log('\n👥 Validating user management page testids...');
    
    try {
      await this.page.goto(`${this.baseUrl}/admin/users`);
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
      
      const userTestids = [
        { id: 'users-page', description: 'Main users page container' },
        { id: 'create-user-button', description: 'Create new user button' },
        { id: 'users-table', description: 'Users data table' },
        { id: 'user-search', description: 'User search input' },
        { id: 'users-loading', description: 'Loading state indicator' }
      ];

      const results = [];
      for (const testid of userTestids) {
        const element = await this.page.locator(`[data-testid="${testid.id}"]`);
        const count = await element.count();
        const found = count > 0;
        
        results.push({ ...testid, found, count });
        console.log(`  ${found ? '✅' : '❌'} ${testid.id}: ${found ? 'FOUND' : 'MISSING'} - ${testid.description}`);
      }

      return results;
      
    } catch (error) {
      console.log(`  ⚠️ Could not validate user management page: ${error.message}`);
      return [];
    }
  }

  async generateReport(allResults) {
    console.log('\n📊 TESTID VALIDATION REPORT');
    console.log('='.repeat(50));
    
    let totalTestids = 0;
    let foundTestids = 0;
    
    for (const [pageName, results] of Object.entries(allResults)) {
      if (!results || results.length === 0) continue;
      
      const pageFound = results.filter(r => r.found).length;
      const pageTotal = results.length;
      
      console.log(`\n📄 ${pageName.toUpperCase()}: ${pageFound}/${pageTotal} testids found`);
      
      const missing = results.filter(r => !r.found);
      if (missing.length > 0) {
        console.log('  Missing testids:');
        missing.forEach(m => console.log(`    - ${m.id}: ${m.description}`));
      }
      
      totalTestids += pageTotal;
      foundTestids += pageFound;
    }
    
    console.log('\n🎯 OVERALL SUMMARY:');
    console.log(`  Total testids checked: ${totalTestids}`);
    console.log(`  Found: ${foundTestids}`);
    console.log(`  Missing: ${totalTestids - foundTestids}`);
    console.log(`  Success rate: ${Math.round((foundTestids / totalTestids) * 100)}%`);
    
    if (foundTestids === totalTestids) {
      console.log('  🎉 All testids are present!');
    } else {
      console.log('  ⚠️ Some testids are missing - this may affect test reliability');
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function main() {
  const validator = new TestidValidator();
  const results = {};
  
  try {
    await validator.initialize();
    
    // Validate login page
    results.login = await validator.validateLoginPage();
    
    // Attempt demo login
    const loginSuccess = await validator.attemptDemoLogin();
    
    if (loginSuccess) {
      // Validate navigation if login succeeded
      results.navigation = await validator.validateNavigation();
      
      // Validate user management page
      results.userManagement = await validator.validateUserManagementPage();
    } else {
      console.log('⚠️ Skipping navigation and page validation due to login failure');
    }
    
    // Generate comprehensive report
    await validator.generateReport(results);
    
  } catch (error) {
    console.error('❌ Testid validation failed:', error.message);
    process.exit(1);
  } finally {
    await validator.cleanup();
  }
  
  console.log('\n✅ Testid validation completed');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TestidValidator;