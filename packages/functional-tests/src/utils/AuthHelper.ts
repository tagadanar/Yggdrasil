/**
 * Authentication helper for functional tests
 * Handles user creation, login, and token management
 */

import { ApiClient, createApiClient } from './ApiClient';
import { testEnvironment } from '../config/environment';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TestUser {
  id: string;
  email: string;
  role: UserRole;
  profile: {
    firstName: string;
    lastName: string;
  };
  password: string;
  isActive: boolean;
}

export type UserRole = 'admin' | 'staff' | 'teacher' | 'student';

export interface AuthResult {
  success: boolean;
  user?: TestUser;
  tokens?: AuthTokens;
  error?: string;
}

export class AuthHelper {
  private authClient: ApiClient;
  private userClient: ApiClient;
  private testUsers: Map<string, TestUser> = new Map();
  private userTokens: Map<string, AuthTokens> = new Map();

  constructor() {
    this.authClient = createApiClient('auth');
    this.userClient = createApiClient('user');
  }

  /**
   * Create a test user with the specified role
   */
  async createTestUser(role: UserRole, customData?: Partial<TestUser>): Promise<TestUser> {
    const timestamp = Date.now();
    const userData = {
      email: customData?.email || `${role}-${timestamp}@yggdrasil.test`,
      password: customData?.password || 'TestPassword123!',
      role,
      profile: {
        firstName: customData?.profile?.firstName || `Test${role.charAt(0).toUpperCase()}${role.slice(1)}`,
        lastName: customData?.profile?.lastName || 'User',
      },
      isActive: customData?.isActive !== undefined ? customData.isActive : true,
    };

    try {
      const response = await this.authClient.post('/api/auth/register', userData);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create test user');
      }

      const testUser: TestUser = {
        id: response.data.data.user._id,
        email: userData.email,
        role,
        profile: userData.profile,
        password: userData.password,
        isActive: userData.isActive,
      };

      this.testUsers.set(testUser.id, testUser);
      this.testUsers.set(testUser.email, testUser);
      
      return testUser;
    } catch (error: any) {
      throw new Error(`Failed to create test user: ${error.message}`);
    }
  }

  /**
   * Login as a specific user and return tokens
   */
  async loginAs(userOrRole: TestUser | UserRole): Promise<AuthResult> {
    let user: TestUser;

    if (typeof userOrRole === 'string') {
      // Create a new user with the specified role
      user = await this.createTestUser(userOrRole);
    } else {
      user = userOrRole;
    }

    try {
      const response = await this.authClient.post('/api/auth/login', {
        email: user.email,
        password: user.password,
      });

      if (!response.data.success) {
        return {
          success: false,
          error: response.data.error || 'Login failed',
        };
      }

      const tokens: AuthTokens = {
        accessToken: response.data.data.accessToken,
        refreshToken: response.data.data.refreshToken,
        expiresIn: response.data.data.expiresIn,
      };

      this.userTokens.set(user.id, tokens);
      this.userTokens.set(user.email, tokens);

      return {
        success: true,
        user,
        tokens,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Login failed: ${error.message}`,
      };
    }
  }

  /**
   * Get tokens for a specific user
   */
  getTokens(userIdOrEmail: string): AuthTokens | undefined {
    return this.userTokens.get(userIdOrEmail);
  }

  /**
   * Get user by ID or email
   */
  getUser(userIdOrEmail: string): TestUser | undefined {
    return this.testUsers.get(userIdOrEmail);
  }

  /**
   * Refresh tokens for a user
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const response = await this.authClient.post('/api/auth/refresh-token', {
        refreshToken,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Token refresh failed');
      }

      return {
        accessToken: response.data.data.accessToken,
        refreshToken: response.data.data.refreshToken,
        expiresIn: response.data.data.expiresIn,
      };
    } catch (error: any) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Logout a user
   */
  async logout(accessToken: string): Promise<void> {
    try {
      const client = new ApiClient(testEnvironment.services.auth, accessToken);
      await client.post('/api/auth/logout');
    } catch (error: any) {
      // Logout failure is not critical for tests
      console.warn(`Logout failed: ${error.message}`);
    }
  }

  /**
   * Create an authenticated API client for a user
   */
  async createAuthenticatedClient(service: keyof typeof testEnvironment.services, userOrRole: TestUser | UserRole): Promise<ApiClient> {
    const authResult = await this.loginAs(userOrRole);
    
    if (!authResult.success || !authResult.tokens) {
      throw new Error(`Failed to authenticate user: ${authResult.error}`);
    }

    return createApiClient(service, authResult.tokens.accessToken);
  }

  /**
   * Create predefined test users for common scenarios
   */
  async createTestUserSet(): Promise<{
    admin: TestUser;
    staff: TestUser;
    teacher: TestUser;
    student: TestUser;
  }> {
    const [admin, staff, teacher, student] = await Promise.all([
      this.createTestUser('admin', { email: 'admin@yggdrasil.test' }),
      this.createTestUser('staff', { email: 'staff@yggdrasil.test' }),
      this.createTestUser('teacher', { email: 'teacher@yggdrasil.test' }),
      this.createTestUser('student', { email: 'student@yggdrasil.test' }),
    ]);

    return { admin, staff, teacher, student };
  }

  /**
   * Clean up all test users and tokens
   */
  async cleanup(): Promise<void> {
    // Clear local storage
    this.testUsers.clear();
    this.userTokens.clear();

    // Note: In a real implementation, you might want to delete users from the database
    // For now, we rely on the database cleanup in the test setup
  }

  /**
   * Validate token format and expiration
   */
  isTokenValid(token: string): boolean {
    try {
      // Basic JWT format check
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }

      // Decode payload to check expiration
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user role from token
   */
  getRoleFromToken(token: string): UserRole | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || null;
    } catch (error) {
      return null;
    }
  }
}

// Singleton instance for test use
export const authHelper = new AuthHelper();

export default AuthHelper;