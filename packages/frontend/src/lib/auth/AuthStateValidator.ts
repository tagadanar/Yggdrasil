// packages/frontend/src/lib/auth/AuthStateValidator.ts
// Authentication State Consistency Verification

import { User } from '@yggdrasil/shared-utilities';
import { tokenStorage } from '@/lib/auth/tokenStorage';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export interface AuthStateValidationResult {
  isConsistent: boolean;
  issues: string[];
  correctedState?: {
    shouldBeAuthenticated: boolean;
    recommendedRoute: string;
  };
}

export interface AuthState {
  user: User | null;
  hasTokens: boolean;
  currentRoute: string;
}

/**
 * Authentication State Consistency Validator
 * Monitors and corrects auth state inconsistencies
 */
export class AuthStateValidator {
  /**
   * Validate current authentication state consistency
   */
  static validateAuthState(user: User | null, currentRoute?: string): AuthStateValidationResult {
    const hasTokens = this.hasValidTokens();
    const route = currentRoute || (typeof window !== 'undefined' ? window.location.pathname : '/');
    const isOnLoginPage = route === '/auth/login' || route.startsWith('/auth/login');
    const isAuthenticated = !!user;
    

    const issues: string[] = [];
    let isConsistent = true;
    let correctedState: AuthStateValidationResult['correctedState'];

    // Check for inconsistencies
    if (isAuthenticated && hasTokens && isOnLoginPage) {
      issues.push('User is authenticated but on login page');
      isConsistent = false;
      correctedState = {
        shouldBeAuthenticated: true,
        recommendedRoute: this.getRecommendedRouteForUser(user)
      };
    }

    if (isAuthenticated && !hasTokens) {
      issues.push('User state exists but no valid tokens found');
      isConsistent = false;
      correctedState = {
        shouldBeAuthenticated: false,
        recommendedRoute: '/auth/login'
      };
    }

    if (!isAuthenticated && hasTokens && !isOnLoginPage) {
      issues.push('Valid tokens exist but no user state');
      isConsistent = false;
      correctedState = {
        shouldBeAuthenticated: true,
        recommendedRoute: route // Stay on current page, should trigger auth reload
      };
    }

    if (!isAuthenticated && !hasTokens && !isOnLoginPage && !this.isPublicRoute(route)) {
      issues.push('No authentication on protected route');
      isConsistent = false;
      correctedState = {
        shouldBeAuthenticated: false,
        recommendedRoute: '/auth/login'
      };
    }


    return {
      isConsistent,
      issues,
      correctedState
    };
  }

  /**
   * Auto-correct authentication state inconsistencies
   */
  static async correctAuthState(
    validationResult: AuthStateValidationResult,
    router: AppRouterInstance,
    forceCorrection = false
  ): Promise<boolean> {
    if (!validationResult.correctedState) {
      return true;
    }

    if (!validationResult.isConsistent || forceCorrection) {
      
      const { shouldBeAuthenticated, recommendedRoute } = validationResult.correctedState;
      
      try {
        if (!shouldBeAuthenticated) {
          // Clear invalid auth state
          tokenStorage.clearTokens();
          
          // Redirect to login if not already there
          if (recommendedRoute !== window.location.pathname) {
            router.push(recommendedRoute);
          }
        } else {
          // Navigate to recommended route for authenticated users
          if (recommendedRoute !== window.location.pathname) {
            router.push(recommendedRoute);
          }
        }
        
        return true;
      } catch (error) {
        console.error('🔒 AUTH VALIDATOR: Failed to correct auth state:', error);
        return false;
      }
    }

    return true;
  }

  /**
   * Monitor auth state continuously
   */
  static createAuthStateMonitor(
    getUserState: () => User | null,
    router: AppRouterInstance,
    options: {
      intervalMs?: number;
      autoCorrect?: boolean;
    } = {}
  ): () => void {
    const { intervalMs = 30000, autoCorrect = false } = options; // Check every 30 seconds by default
    
    const checkAuthState = () => {
      const user = getUserState();
      const validation = this.validateAuthState(user);
      
      if (!validation.isConsistent) {
        if (autoCorrect) {
          this.correctAuthState(validation, router, false);
        }
      }
    };

    // Initial check
    checkAuthState();

    // Set up periodic monitoring
    const intervalId = setInterval(checkAuthState, intervalMs);
    
    // Return cleanup function
    return () => {
      clearInterval(intervalId);
    };
  }

  /**
   * Get recommended route for authenticated user based on role
   */
  private static getRecommendedRouteForUser(user: User): string {
    if (!user) return '/auth/login';
    
    switch (user.role) {
      case 'student':
        return '/courses'; // Students see "My Enrollments"
      case 'teacher':
        return '/courses'; // Teachers see "My Courses"
      case 'admin':
      case 'staff':
        return '/courses'; // Admin/staff see "Course Management"
      default:
        return '/news'; // Fallback to news page
    }
  }

  /**
   * Check if route is public (doesn't require authentication)
   */
  private static isPublicRoute(route: string): boolean {
    const publicRoutes = [
      '/',
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/about',
      '/contact'
    ];
    
    return publicRoutes.includes(route) || route.startsWith('/public/');
  }

  /**
   * Check if valid tokens exist in storage
   */
  private static hasValidTokens(): boolean {
    try {
      const tokens = tokenStorage.getTokens();
      return !!(tokens?.accessToken && tokens?.refreshToken);
    } catch {
      return false;
    }
  }

  /**
   * Validate token expiration
   */
  private static isTokenExpired(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3 || !parts[1]) {
        return true; // Invalid token format
      }
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime;
    } catch {
      return true; // Assume expired if we can't parse
    }
  }

  /**
   * Comprehensive auth health check
   */
  static async performHealthCheck(user: User | null): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check basic state consistency
    const validation = this.validateAuthState(user);
    issues.push(...validation.issues);
    
    // Check token validity
    const tokens = tokenStorage.getTokens();
    if (tokens?.accessToken) {
      if (this.isTokenExpired(tokens.accessToken)) {
        issues.push('Access token is expired');
        recommendations.push('Refresh tokens or re-authenticate');
      }
    }
    
    if (tokens?.refreshToken) {
      if (this.isTokenExpired(tokens.refreshToken)) {
        issues.push('Refresh token is expired');
        recommendations.push('User must re-authenticate');
      }
    }
    
    // Check localStorage/sessionStorage consistency
    try {
      const storedTokens = tokenStorage.getTokens();
      const hasStorageIssues = !storedTokens && user;
      if (hasStorageIssues) {
        issues.push('Token storage inconsistency detected');
        recommendations.push('Clear browser storage and re-authenticate');
      }
    } catch (error) {
      issues.push('Token storage access error');
      recommendations.push('Check browser storage permissions');
    }
    
    const healthy = issues.length === 0;
    
    return {
      healthy,
      issues,
      recommendations
    };
  }
}

// Export singleton utilities
export const authStateValidator = AuthStateValidator;