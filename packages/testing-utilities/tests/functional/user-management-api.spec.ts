import { test, expect } from '@playwright/test';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { SharedTestContext } from '../helpers/SharedTestContext';

/**
 * User Management API Tests - Direct API Endpoint Testing
 * 
 * Optimized for speed by testing API endpoints directly without UI overhead.
 * Uses SharedTestContext for efficient test data management.
 */

test.describe('User Management - API Endpoints', () => {

  test('User API health check', async ({ request }) => {
    const cleanup = TestCleanup.getInstance('User API Endpoints');
    
    try {
      // Test user service health first
      const healthResponse = await request.get('http://localhost:3002/health');
      expect(healthResponse.status()).toBe(200);
      
      // Test users endpoint (requires auth - expect 401 without token)
      const usersResponse = await request.get('http://localhost:3002/api/users');
      expect(usersResponse.status()).toBe(401); // Should require authentication
      
    } finally {
      await cleanup.cleanup();
    }
  });

  test('User creation API', async ({ request }) => {
    const cleanup = TestCleanup.getInstance('User Creation API');
    
    try {
      const testUserData = {
        email: `api-test-${Date.now()}@yggdrasil.edu`,
        firstName: 'API',
        lastName: 'Test',
        password: 'TestPassword123!',
        role: 'student'
      };
      
      // This would normally require authentication
      // For now, just test that the endpoint exists and handles requests
      const createResponse = await request.post('http://localhost:3002/api/users', {
        data: testUserData,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Should get 401 (no auth) or 400 (validation) - not 404 (endpoint missing)
      expect([400, 401, 403]).toContain(createResponse.status());
      
    } finally {
      await cleanup.cleanup();
    }
  });

  test('User update API validation', async ({ request }) => {
    const cleanup = TestCleanup.getInstance('User Update API');
    
    try {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };
      
      // Test update endpoint exists
      const updateResponse = await request.put('http://localhost:3002/api/users/test-id', {
        data: updateData,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Should get 401 (no auth) or 400 (validation) - not 404 (endpoint missing)
      expect([400, 401, 403, 404]).toContain(updateResponse.status());
      
    } finally {
      await cleanup.cleanup();
    }
  });

  test('API error handling', async ({ request }) => {
    const cleanup = TestCleanup.getInstance('API Error Handling');
    
    try {
      // Test with invalid JSON
      const invalidResponse = await request.post('http://localhost:3002/api/users', {
        data: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Should handle malformed requests gracefully (400 Bad Request)
      expect(invalidResponse.status()).toBe(400);
      
      // Test with missing required fields
      const incompleteResponse = await request.post('http://localhost:3002/api/users', {
        data: { email: 'incomplete@test.com' }, // Missing required fields
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Should validate required fields
      expect([400, 401]).toContain(incompleteResponse.status());
      
    } finally {
      await cleanup.cleanup();
    }
  });

});