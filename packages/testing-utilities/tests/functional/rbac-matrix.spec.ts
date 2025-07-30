import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { TestDataFactory } from '../helpers/TestDataFactory';
import { captureEnhancedError } from '../helpers/enhanced-error-context';

test.describe('Role-Based Access Control Matrix', () => {
  test('RBAC-001: Complete Role-Based Access Control Matrix - All Modules', async ({ browser }) => {
    const cleanup = TestCleanup.getInstance('RBAC-001');
    const factory = new TestDataFactory('RBAC-001');
    
    try {
      // Comprehensive access matrix for all roles and modules
      const accessMatrix = {
        admin: { 
          allowed: ['/users', '/courses', '/news', '/planning', '/statistics'],
          forbidden: [],
          expectedElements: {
            '/users': '[data-testid="users-table"]',
            '/courses': '[data-testid="courses-container"]',
            '/news': '[data-testid="news-list"]',
            '/planning': '[data-testid="calendar"]',
            '/statistics': '[data-testid="statistics-dashboard"]'
          }
        },
        staff: {
          allowed: ['/courses', '/news', '/planning', '/statistics'],
          forbidden: ['/users'],
          expectedElements: {
            '/courses': '[data-testid="courses-container"]',
            '/news': '[data-testid="news-list"]',
            '/planning': '[data-testid="calendar"]',
            '/statistics': '[data-testid="statistics-dashboard"]'
          }
        },
        teacher: {
          allowed: ['/courses', '/statistics'],
          forbidden: ['/users', '/news', '/planning'],
          expectedElements: {
            '/courses': '[data-testid="courses-container"]',
            '/statistics': '[data-testid="statistics-dashboard"]'
          }
        },
        student: {
          allowed: ['/statistics'],
          forbidden: ['/users', '/courses', '/news', '/planning'],
          expectedElements: {
            '/statistics': '[data-testid="statistics-dashboard"]'
          }
        }
      };
      
      // Test each role sequentially with complete isolation
      for (const [role, access] of Object.entries(accessMatrix)) {
        // Testing role access
        
        // Create user and auth context for this role
        const user = await factory.users.createUser(role as any);
        cleanup.trackDocument('users', user._id);
        
        const context = await browser.newContext();
        cleanup.trackBrowserContext(context);
        const page = await context.newPage();
        const auth = new CleanAuthHelper(context, `RBAC-${role}`);
        
        try {
          await auth.loginWithCustomUser(user.email, 'TestPass123!');
          
          // Test allowed endpoints
          // Testing allowed endpoints
          for (const endpoint of access.allowed) {
            await page.goto(endpoint);
            
            // Wait for the page to load and verify we're on the correct page
            await page.waitForLoadState('networkidle', { timeout: 3000 });
            const currentUrl = page.url();
            
            // Verify we stayed on the requested page (not redirected)
            expect(currentUrl).toContain(endpoint);
            
            // Verify no access denied message
            const accessDeniedCount = await page.locator('[data-testid="access-denied"]').count();
            expect(accessDeniedCount).toBe(0);
            
            // Verify expected content is visible
            const expectedElement = access.expectedElements[endpoint];
            if (expectedElement) {
              await expect(page.locator(expectedElement)).toBeVisible({ timeout: 5000 });
            }
            
            // Access granted
          }
          
          // Test forbidden endpoints
          if (access.forbidden.length > 0) {
            // Testing forbidden endpoints
            for (const endpoint of access.forbidden) {
              await page.goto(endpoint);
              
              // Wait for redirect or error page
              await page.waitForLoadState('networkidle', { timeout: 3000 });
              const currentUrl = page.url();
              
              // Verify we were redirected away or shown error
              const wasRedirected = !currentUrl.includes(endpoint);
              const hasAccessDenied = await page.locator('[data-testid="access-denied"]').count() > 0;
              const hasErrorMessage = await page.locator('text=/not authorized|access denied|forbidden/i').count() > 0;
              
              expect(wasRedirected || hasAccessDenied || hasErrorMessage).toBeTruthy();
              
              // Access denied
            }
          }
          
        } finally {
          // Clean up auth and context for this role
          await auth.cleanup();
          await context.close();
        }
      }
      
      // All RBAC tests completed successfully
      
    } finally {
      await cleanup.cleanup();
    }
  });
  
  test('RBAC-002: API Endpoint Authorization Matrix', async ({ browser }) => {
    const cleanup = TestCleanup.getInstance('RBAC-002');
    const factory = new TestDataFactory('RBAC-002');
    
    try {
      // API endpoint access matrix
      const apiMatrix = {
        admin: {
          allowed: [
            { method: 'GET', endpoint: '/api/users' },
            { method: 'POST', endpoint: '/api/users' },
            { method: 'PUT', endpoint: '/api/users/:id' },
            { method: 'DELETE', endpoint: '/api/users/:id' },
            { method: 'GET', endpoint: '/api/courses' },
            { method: 'POST', endpoint: '/api/courses' },
            { method: 'GET', endpoint: '/api/statistics/platform' }
          ]
        },
        staff: {
          allowed: [
            { method: 'GET', endpoint: '/api/courses' },
            { method: 'POST', endpoint: '/api/courses' },
            { method: 'GET', endpoint: '/api/news' },
            { method: 'POST', endpoint: '/api/news' }
          ],
          forbidden: [
            { method: 'GET', endpoint: '/api/users' },
            { method: 'DELETE', endpoint: '/api/users/:id' }
          ]
        },
        teacher: {
          allowed: [
            { method: 'GET', endpoint: '/api/courses' },
            { method: 'POST', endpoint: '/api/courses' },
            { method: 'GET', endpoint: '/api/statistics/my-courses' }
          ],
          forbidden: [
            { method: 'GET', endpoint: '/api/users' },
            { method: 'DELETE', endpoint: '/api/courses/:id' },
            { method: 'POST', endpoint: '/api/news' }
          ]
        },
        student: {
          allowed: [
            { method: 'GET', endpoint: '/api/statistics/my-progress' },
            { method: 'GET', endpoint: '/api/courses/enrolled' }
          ],
          forbidden: [
            { method: 'GET', endpoint: '/api/users' },
            { method: 'POST', endpoint: '/api/courses' },
            { method: 'DELETE', endpoint: '/api/courses/:id' }
          ]
        }
      };
      
      // Test each role's API access
      for (const [role, access] of Object.entries(apiMatrix)) {
        // Testing API access
        
        const user = await factory.users.createUser(role as any);
        cleanup.trackDocument('users', user._id);
        
        const context = await browser.newContext();
        cleanup.trackBrowserContext(context);
        const page = await context.newPage();
        const auth = new CleanAuthHelper(context, `RBAC-API-${role}`);
        
        try {
          const { accessToken } = await auth.loginWithCustomUser(user.email, 'TestPass123!');
          
          // Test allowed API endpoints
          if (access.allowed) {
            for (const { method, endpoint } of access.allowed) {
              const response = await page.request[method.toLowerCase()](endpoint.replace(':id', user._id), {
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                }
              });
              
              expect(response.status()).toBeLessThan(400);
              // API access allowed
            }
          }
          
          // Test forbidden API endpoints
          if (access.forbidden) {
            for (const { method, endpoint } of access.forbidden) {
              const response = await page.request[method.toLowerCase()](endpoint.replace(':id', user._id), {
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                },
                failOnStatusCode: false
              });
              
              expect(response.status()).toBeGreaterThanOrEqual(400);
              // API access forbidden
            }
          }
          
        } finally {
          await auth.cleanup();
          await context.close();
        }
      }
      
    } finally {
      await cleanup.cleanup();
    }
  });
});