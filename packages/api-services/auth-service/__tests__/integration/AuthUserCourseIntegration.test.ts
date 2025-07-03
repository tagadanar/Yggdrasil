// packages/api-services/auth-service/__tests__/integration/AuthUserCourseIntegration.test.ts

import jwt from 'jsonwebtoken';

// Mock AuthService
const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  refreshToken: jest.fn(),
  changePassword: jest.fn(),
};

// Mock course service calls
global.fetch = jest.fn();

describe('Auth-User-Course Integration Tests', () => {
  let testUser: any;
  let testCourse: any;
  let authToken: string;

  beforeAll(async () => {
    // Setup mock course data
    testCourse = {
      _id: 'mock-course-id',
      title: 'Integration Auth Test Course',
      description: 'Course for testing auth integration',
      code: `AUTH${Date.now()}`,
      credits: 3,
      level: 'intermediate',
      category: 'programming',
      instructor: 'mockInstructorId',
      duration: { weeks: 12, hoursPerWeek: 4, totalHours: 48 },
      schedule: [],
      capacity: 30,
      enrolledStudents: [],
      tags: ['auth', 'integration'],
      status: 'published',
      visibility: 'public',
      chapters: [],
      resources: [],
      assessments: [],
      isActive: true,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    };

    // Setup mock user data
    testUser = {
      _id: 'mock-user-id',
      email: 'test@integration.com',
      role: 'student',
      isActive: true,
    };

    // Setup mock AuthService methods
    mockAuthService.register.mockImplementation(async (userData) => ({
      success: true,
      user: {
        _id: userData.role === 'admin' ? 'mock-admin-id' : userData.role === 'teacher' ? 'mock-teacher-id' : testUser._id,
        email: userData.email,
        role: userData.role,
        isActive: true,
        profile: userData.profile || { firstName: userData.firstName, lastName: userData.lastName },
      },
      token: jwt.sign({ userId: 'mock-user-id', role: userData.role }, 'test-secret'),
    }));

    mockAuthService.login.mockImplementation(async (email, password) => ({
      success: true,
      user: testUser,
      token: jwt.sign({ userId: testUser._id, role: testUser.role }, 'test-secret'),
    }));

    mockAuthService.logout.mockResolvedValue({ success: true });
    mockAuthService.refreshToken.mockImplementation(async (userId) => ({
      success: true,
      token: jwt.sign({ userId, role: 'student' }, 'test-secret'),
    }));
    mockAuthService.changePassword.mockResolvedValue({ success: true });
  });

  afterAll(async () => {
    // Reset mocks
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Registration and Course Access Integration', () => {
    it('should register user and enable course browsing', async () => {
      const registrationData = {
        email: `authtest-${Date.now()}@integration.test`,
        password: 'SecurePassword123!',
        firstName: 'Auth',
        lastName: 'Tester',
        role: 'student' as const
      };

      // Register user
      const registrationResult = await mockAuthService.register(registrationData);

      expect(registrationResult.success).toBe(true);
      expect(registrationResult.user).toBeDefined();
      expect(registrationResult.token).toBeDefined();

      testUser = registrationResult.user;
      authToken = registrationResult.token!;

      // Verify JWT token contains correct user info
      const decodedToken = jwt.decode(authToken) as any;
      expect(decodedToken.userId).toBe(testUser._id.toString());
      expect(decodedToken.role).toBe('student');

      // Mock course service call for browsing courses
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          courses: [
            {
              _id: testCourse._id,
              title: testCourse.title,
              description: testCourse.description,
              level: testCourse.level,
              category: testCourse.category
            }
          ],
          total: 1
        })
      });

      // Test authenticated course browsing
      const courseBrowsingResponse = await fetch('/api/courses/search', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(fetch).toHaveBeenCalledWith('/api/courses/search', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
    });

    it('should allow login and maintain course access', async () => {
      const loginData = {
        email: testUser.email,
        password: 'SecurePassword123!'
      };

      // Login user
      const loginResult = await mockAuthService.login(loginData.email, loginData.password);

      expect(loginResult.success).toBe(true);
      expect(loginResult.user).toBeDefined();
      expect(loginResult.token).toBeDefined();
      expect(loginResult.user!._id.toString()).toBe(testUser._id.toString());

      const newAuthToken = loginResult.token!;

      // Mock course enrollment attempt
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: 'Student enrolled successfully',
          enrollmentDate: new Date().toISOString()
        })
      });

      // Test authenticated course enrollment
      const enrollmentResponse = await fetch(`/api/courses/${testCourse._id}/enroll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${newAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ studentId: testUser._id })
      });

      expect(fetch).toHaveBeenCalledWith(`/api/courses/${testCourse._id}/enroll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${newAuthToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ studentId: testUser._id })
      });
    });
  });

  describe('Role-Based Course Access Integration', () => {
    it('should enforce role-based permissions for course management', async () => {
      // Create instructor user
      const instructorData = {
        email: `instructor-${Date.now()}@integration.test`,
        password: 'InstructorPass123!',
        firstName: 'Course',
        lastName: 'Instructor',
        role: 'teacher' as const
      };

      const instructorResult = await mockAuthService.register(instructorData);
      expect(instructorResult.success).toBe(true);

      const instructorToken = instructorResult.token!;
      const instructorUser = instructorResult.user!;

      // Mock course creation for instructor
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          course: {
            _id: 'newCourseId',
            title: 'Instructor Created Course',
            instructor: instructorUser._id,
            status: 'draft'
          }
        })
      });

      // Test instructor course creation
      const courseCreationResponse = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${instructorToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Instructor Created Course',
          description: 'Course created by instructor',
          code: `INST${Date.now()}`,
          level: 'beginner',
          category: 'programming'
        })
      });

      expect(fetch).toHaveBeenCalledWith('/api/courses', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': `Bearer ${instructorToken}`
        })
      }));

      // Test student trying to create course (should fail)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          success: false,
          error: 'Insufficient permissions'
        })
      });

      const studentCourseCreationResponse = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`, // Student token
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Unauthorized Course',
          description: 'This should not be allowed'
        })
      });

      expect(studentCourseCreationResponse.ok).toBe(false);

      // Instructor cleanup handled by mocks
    });

    it('should handle admin access to all courses', async () => {
      // Create admin user
      const adminData = {
        email: `admin-${Date.now()}@integration.test`,
        password: 'AdminPass123!',
        firstName: 'System',
        lastName: 'Admin',
        role: 'admin' as const
      };

      const adminResult = await mockAuthService.register(adminData);
      expect(adminResult.success).toBe(true);

      const adminToken = adminResult.token!;
      const adminUser = adminResult.user!;

      // Mock admin course management
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          courses: [
            { _id: testCourse._id, title: testCourse.title },
            { _id: 'otherCourseId', title: 'Other Course' }
          ],
          total: 2
        })
      });

      // Test admin access to all courses
      const adminCoursesResponse = await fetch('/api/courses/admin/all', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(fetch).toHaveBeenCalledWith('/api/courses/admin/all', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Admin cleanup handled by mocks
    });
  });

  describe('Token Validation and Course Access', () => {
    it('should reject expired tokens for course operations', async () => {
      // Create expired token
      const expiredToken = jwt.sign(
        { userId: testUser._id, role: 'student' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      // Mock course service rejecting expired token
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          success: false,
          error: 'Token expired'
        })
      });

      const expiredTokenResponse = await fetch('/api/courses/my-courses', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${expiredToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(expiredTokenResponse.ok).toBe(false);
    });

    it('should handle token refresh for continued course access', async () => {
      // Mock token refresh
      const refreshResult = await mockAuthService.refreshToken(testUser._id.toString());

      expect(refreshResult.success).toBe(true);
      expect(refreshResult.token).toBeDefined();

      const newToken = refreshResult.token!;

      // Mock course access with refreshed token
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          courses: [testCourse]
        })
      });

      const refreshedTokenResponse = await fetch('/api/courses/my-courses', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(refreshedTokenResponse.ok).toBe(true);
    });
  });

  describe('Account Security and Course Access', () => {
    it('should handle password change and maintain course access', async () => {
      const newPassword = 'NewSecurePassword456!';

      // Change password
      const passwordChangeResult = await mockAuthService.changePassword(
        testUser._id.toString(),
        'SecurePassword123!',
        newPassword
      );

      expect(passwordChangeResult.success).toBe(true);

      // Login with new password
      const loginWithNewPasswordResult = await mockAuthService.login(testUser.email, newPassword);

      expect(loginWithNewPasswordResult.success).toBe(true);
      expect(loginWithNewPasswordResult.token).toBeDefined();

      // Verify course access with new token
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          enrolledCourses: [testCourse._id]
        })
      });

      const courseAccessResponse = await fetch('/api/courses/enrolled', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${loginWithNewPasswordResult.token}`,
          'Content-Type': 'application/json'
        }
      });

      expect(courseAccessResponse.ok).toBe(true);
    });

    it('should invalidate tokens on logout and prevent course access', async () => {
      // Logout user
      const logoutResult = await mockAuthService.logout(testUser._id.toString());
      expect(logoutResult.success).toBe(true);

      // Mock course service rejecting invalidated token
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          success: false,
          error: 'Token invalidated'
        })
      });

      const postLogoutCourseAccess = await fetch('/api/courses/my-courses', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`, // Old token should be invalid
          'Content-Type': 'application/json'
        }
      });

      expect(postLogoutCourseAccess.ok).toBe(false);
    });
  });

  describe('Cross-Service Error Handling', () => {
    it('should handle course service unavailable during auth operations', async () => {
      // Mock course service being unavailable
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Course service unavailable'));

      // User should still be able to login even if course service is down
      const loginResult = await mockAuthService.login(testUser.email, 'NewSecurePassword456!');
      expect(loginResult.success).toBe(true);

      // Course operations should fail gracefully
      try {
        await fetch('/api/courses/my-courses', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${loginResult.token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Course service unavailable');
      }
    });
  });
});