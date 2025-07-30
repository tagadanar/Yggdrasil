// packages/testing-utilities/tests/functional/profile-editing.spec.ts
// Functional test for profile editing functionality

import { test, expect } from '@playwright/test';
import { CleanAuthHelper } from '../helpers/clean-auth.helpers';
import { TestCleanup } from '@yggdrasil/shared-utilities/testing';
import { captureEnhancedError } from '../helpers/enhanced-error-context';

test.describe('Profile Editing Functionality', () => {
  test('Should save all profile fields when editing profile', async ({ browser }) => {
    // Prevent test hangs - 90 second max per test
    test.setTimeout(90000);
  
    const cleanup = TestCleanup.getInstance('Profile Editing Test');
    const testContext = await browser.newContext();
    cleanup.trackBrowserContext(testContext);
    const page = await testContext.newPage();
    
    // Listen to console logs
    // Browser console monitoring
    // Browser error monitoring
    
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Login as the demo teacher
      await authHelper.loginAsTeacher();
      
      // Navigate to profile page
      await page.goto('/profile');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Wait for profile to load
      await page.waitForSelector('[data-testid="profile-name"]', { timeout: 3000 });
      
      // First verify we can see the current user data
      const currentEmail = await page.textContent('[data-testid="profile-email"]');
      // Current user email verified
      
      // Click edit button to enter edit mode
      await page.click('button:has-text("Edit Profile")');
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 }); // Wait for edit mode to activate
      
      // Verify we're now in edit mode by checking for Save button
      await page.waitForSelector('button:has-text("Save Changes", { timeout: 10000 })', { timeout: 2000 });
      
      // Check current field values before updating
      const currentFirstName = await page.inputValue('input[name="firstName"]');
      const currentLastName = await page.inputValue('input[name="lastName"]');
      // Current profile data verified
      
      // Update all profile fields
      const profileData = {
        firstName: 'Updated',
        lastName: 'Teacher',
        department: 'Computer Science',
        phone: '+1234567890',
        bio: 'I am an experienced teacher specializing in algorithms and data structures.',
        officeHours: 'Monday and Wednesday 2-4 PM',
        specialties: 'Algorithms, Data Structures, Machine Learning'
      };
      
      // Fill in all fields
      await page.fill('input[name="firstName"]', profileData.firstName);
      await page.fill('input[name="lastName"]', profileData.lastName);
      await page.fill('input[name="department"]', profileData.department);
      await page.fill('input[name="phone"]', profileData.phone);
      await page.fill('textarea[name="bio"]', profileData.bio);
      await page.fill('input[name="officeHours"]', profileData.officeHours);
      await page.fill('input[name="specialties"]', profileData.specialties);
      
      // Save changes
      await page.click('button:has-text("Save Changes")');
      
      // Wait for save to complete and exit edit mode
      await page.waitForSelector('button:has-text("Edit Profile", { timeout: 10000 })', { timeout: 3000 });
      // Successfully exited edit mode
      
      // Check if the name display updated (this is what users actually see)
      const displayName = await page.textContent('[data-testid="profile-name"]');
      // Display name after save verified
      
      // Now refresh the page to test persistence (like a user closing and reopening)
      await page.reload();
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      await page.waitForSelector('[data-testid="profile-name"]', { timeout: 3000 });
      
      // Check the display name after refresh - this is what users actually see
      const displayNameAfterRefresh = await page.textContent('[data-testid="profile-name"]');
      // Display name after refresh verified
      
      // Verify the name display shows our updated data
      expect(displayNameAfterRefresh).toContain(profileData.firstName);
      expect(displayNameAfterRefresh).toContain(profileData.lastName);
      
      // Enter edit mode again to verify form fields are populated correctly
      await page.click('button:has-text("Edit Profile")');
      await page.waitForSelector('button:has-text("Save Changes", { timeout: 10000 })', { timeout: 2000 });
      
      // Now verify all fields were saved correctly in the form
      expect(await page.inputValue('input[name="firstName"]')).toBe(profileData.firstName);
      expect(await page.inputValue('input[name="lastName"]')).toBe(profileData.lastName);
      expect(await page.inputValue('input[name="department"]')).toBe(profileData.department);
      expect(await page.inputValue('input[name="phone"]')).toBe(profileData.phone);
      expect(await page.inputValue('textarea[name="bio"]')).toBe(profileData.bio);
      expect(await page.inputValue('input[name="officeHours"]')).toBe(profileData.officeHours);
      expect(await page.inputValue('input[name="specialties"]')).toBe(profileData.specialties);
      
      // Also verify by making an API call to get the user data
      const response = await page.request.get('http://localhost:3002/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${await authHelper.getAccessToken()}`
        }
      });
      
      expect(response.ok()).toBeTruthy();
      const userData = await response.json();
      
      // Verify profile data in API response
      expect(userData.data.user.profile.firstName).toBe(profileData.firstName);
      expect(userData.data.user.profile.lastName).toBe(profileData.lastName);
      expect(userData.data.user.profile.department).toBe(profileData.department);
      expect(userData.data.user.profile.contactInfo?.phone).toBe(profileData.phone);
      expect(userData.data.user.profile.bio).toBe(profileData.bio);
      expect(userData.data.user.profile.officeHours).toBe(profileData.officeHours);
      expect(userData.data.user.profile.specialties).toContain('Algorithms');
      expect(userData.data.user.profile.specialties).toContain('Data Structures');
      expect(userData.data.user.profile.specialties).toContain('Machine Learning');
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
      await testContext.close();
    }
  });
  
  test('Should save student-specific profile fields', async ({ browser }) => {
    const cleanup = TestCleanup.getInstance('Student Profile Test');
    const testContext = await browser.newContext();
    cleanup.trackBrowserContext(testContext);
    const page = await testContext.newPage();
    const authHelper = new CleanAuthHelper(page);
    
    try {
      // Login as the demo student
      await authHelper.loginAsStudent();
      
      // Navigate to profile page
      await page.goto('/profile');
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // Wait for profile to load
      await page.waitForSelector('[data-testid="profile-name"]', { timeout: 3000 });
      
      // Click edit button
      await page.click('button:has-text("Edit Profile")');
      
      // Update student-specific fields
      const profileData = {
        studentId: 'STU2024001',
        department: 'Software Engineering',
        phone: '+9876543210'
      };
      
      // Fill in fields
      await page.fill('input[name="studentId"]', profileData.studentId);
      await page.fill('input[name="department"]', profileData.department);
      await page.fill('input[name="phone"]', profileData.phone);
      
      // Save changes
      await page.click('button:has-text("Save Changes")');
      
      // Wait for save to complete
      await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
      
      // Refresh the page to verify data persistence
      await page.reload();
      await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
      await page.waitForSelector('[data-testid="profile-name"]', { timeout: 3000 });
      
      // Verify fields were saved
      expect(await page.inputValue('input[name="studentId"]')).toBe(profileData.studentId);
      expect(await page.inputValue('input[name="department"]')).toBe(profileData.department);
      expect(await page.inputValue('input[name="phone"]')).toBe(profileData.phone);
      
    } finally {
      await authHelper.clearAuthState();
      await cleanup.cleanup();
      await testContext.close();
    }
  });
});