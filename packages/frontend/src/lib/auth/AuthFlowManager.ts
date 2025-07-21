// packages/frontend/src/lib/auth/AuthFlowManager.ts
// Robust Authentication Flow Manager with Navigation Resilience

import { User } from '@yggdrasil/shared-utilities';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export interface AuthNavigationResult {
  success: boolean;
  finalRoute: string;
  attempts: number;
  error?: string;
}

/**
 * Simplified Authentication Flow Manager
 * Handles role-based navigation after login with browser compatibility
 */
export class AuthFlowManager {
  /**
   * Handle login success with role-based navigation
   */
  async handleLoginSuccess(
    user: User,
    router: AppRouterInstance
  ): Promise<AuthNavigationResult> {

    try {
      // Determine target route based on user role
      const targetRoute = this.determineTargetRoute(user);

      // Perform navigation with simple retry
      const result = await this.performNavigation(router, targetRoute);

      return result;
    } catch (error) {
      console.error('🔐 AUTH FLOW: Navigation failed:', error);
      
      // Fallback navigation
      try {
        router.push('/news');
        return {
          success: true,
          finalRoute: '/news',
          attempts: 1,
          error: 'Used fallback navigation'
        };
      } catch (fallbackError) {
        console.error('🔐 AUTH FLOW: Fallback navigation failed:', fallbackError);
        return {
          success: false,
          finalRoute: '/auth/login',
          attempts: 1,
          error: error instanceof Error ? error.message : 'Navigation failed'
        };
      }
    }
  }

  /**
   * Determine target route based on user role
   */
  private determineTargetRoute(user: User): string {
    
    // All users should be redirected to /news after login
    return '/news';
  }

  /**
   * Perform navigation with enhanced debugging and fallback
   */
  private async performNavigation(router: AppRouterInstance, targetRoute: string): Promise<AuthNavigationResult> {
    
    try {
      // Attempt Next.js router navigation first
      router.push(targetRoute);
      
      // Brief wait to allow navigation to start
      await this.sleep(500);
      
      // Check if navigation actually occurred
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        
        if (currentPath === targetRoute) {
          return {
            success: true,
            finalRoute: targetRoute,
            attempts: 1
          };
        } else if (currentPath === '/auth/login') {
          // Fallback to direct window navigation
          window.location.href = targetRoute;
          
          return {
            success: true,
            finalRoute: targetRoute,
            attempts: 2,
            error: 'Used window.location.href fallback'
          };
        } else {
          return {
            success: true,
            finalRoute: currentPath,
            attempts: 1,
            error: 'Navigation went to unexpected route'
          };
        }
      }
      
      // If we can't check window location (SSR), assume success
      return {
        success: true,
        finalRoute: targetRoute,
        attempts: 1
      };
      
    } catch (error) {
      console.error('🔐 AUTH FLOW: Navigation failed with error:', error);
      
      // Emergency fallback
      try {
        if (typeof window !== 'undefined') {
          window.location.href = targetRoute;
          return {
            success: true,
            finalRoute: targetRoute,
            attempts: 1,
            error: 'Used emergency window.location.href fallback'
          };
        }
      } catch (fallbackError) {
        console.error('🔐 AUTH FLOW: Emergency fallback also failed:', fallbackError);
      }
      
      return {
        success: false,
        finalRoute: '/auth/login',
        attempts: 1,
        error: error instanceof Error ? error.message : 'Navigation failed'
      };
    }
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

}

// Export singleton instance for app-wide use
export const authFlowManager = new AuthFlowManager();