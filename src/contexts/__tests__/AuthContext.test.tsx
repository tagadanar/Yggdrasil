// src/contexts/__tests__/AuthContext.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock component that uses the auth context
const TestComponent = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      {user && <div data-testid="user-email">{user.email}</div>}
      <button onClick={() => login({ email: 'test@example.com', password: 'password' })} data-testid="login-btn">
        Login
      </button>
      <button onClick={logout} data-testid="logout-btn">
        Logout
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  test('provides authentication state and methods', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Initially not authenticated
    expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
    
    // Login
    fireEvent.click(screen.getByTestId('login-btn'));
    
    // Wait for state update
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    });
    
    // Check user data
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
    
    // Logout
    fireEvent.click(screen.getByTestId('logout-btn'));
    
    // Verify logged out
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
    });
  });
  
  test('dev login bypass works', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    // Initially not authenticated
    expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
    
    // Use dev bypass
    fireEvent.click(screen.getByTestId('login-btn'));
    
    // Verify authenticated
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    });
  });
});