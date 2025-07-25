// packages/frontend/src/lib/auth/tokenSync.ts
// Token synchronization utility for cross-tab and state management

import { tokenStorage } from './tokenStorage';
import { AuthTokens } from '@yggdrasil/shared-utilities';

type TokenChangeCallback = (tokens: AuthTokens | null) => void;

class TokenSyncManager {
  private callbacks: Set<TokenChangeCallback> = new Set();
  private initialized = false;

  initialize() {
    if (this.initialized || typeof window === 'undefined') return;
    
    // Disable token sync in test environment to prevent cross-test interference
    if (typeof window !== 'undefined' && (window as any).tokenSyncDisabled) {
      this.initialized = true;
      return;
    }
    
    // Listen for storage events from other tabs
    window.addEventListener('storage', this.handleStorageChange);
    this.initialized = true;
  }

  cleanup() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageChange);
    }
    this.callbacks.clear();
    this.initialized = false;
  }

  subscribe(callback: TokenChangeCallback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  notifyTokenChange(tokens: AuthTokens | null) {
    // Notify all subscribers
    this.callbacks.forEach(callback => {
      try {
        callback(tokens);
      } catch (error) {
        console.error('Token sync callback error:', error);
      }
    });

    // Skip storage events in test environment
    if (typeof window !== 'undefined' && (window as any).tokenSyncDisabled) {
      return;
    }

    // Trigger storage event for other tabs
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'yggdrasil_token_sync',
        newValue: tokens ? JSON.stringify(tokens) : null,
        url: window.location.href
      }));
    }
  }

  private handleStorageChange = (event: StorageEvent) => {
    if (event.key === 'yggdrasil_token_sync') {
      const tokens = event.newValue ? JSON.parse(event.newValue) : null;
      this.callbacks.forEach(callback => {
        try {
          callback(tokens);
        } catch (error) {
          console.error('Token sync storage callback error:', error);
        }
      });
    }
  };
}

export const tokenSync = new TokenSyncManager();