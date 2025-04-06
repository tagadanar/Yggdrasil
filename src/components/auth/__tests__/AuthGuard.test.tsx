// src/components/auth/__tests__/AuthGuard.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthGuard } from '../AuthGuard';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('AuthGuard', () => {
  test('renders loading state when auth is loading', () => {
    jest.spyOn(require('@/contexts/AuthContext'), 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(
      <AuthProvider>
        <AuthGuard>
          <div>Protected content</div>
        </AuthGuard>
      </AuthProvider>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('redirects when user is not authenticated', () => {
    const pushMock = jest.fn();
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({
      push: pushMock,
    });

    jest.spyOn(require('@/contexts/AuthContext'), 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(
      <AuthProvider>
        <AuthGuard>
          <div>Protected content</div>
        </AuthGuard>
      </AuthProvider>
    );

    expect(pushMock).toHaveBeenCalledWith('/login');
  });

  test('renders children when user is authenticated', () => {
    jest.spyOn(require('@/contexts/AuthContext'), 'useAuth').mockReturnValue({
      user: { id: '1', name: 'Test User', email: 'test@example.com', role: 'student' },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
    });

    render(
      <AuthProvider>
        <AuthGuard>
          <div>Protected content</div>
        </AuthGuard>
      </AuthProvider>
    );

    expect(screen.getByText(/protected content/i)).toBeInTheDocument();
  });
});