import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import HomePage from '@/app/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock AuthContext
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('Authentication Redirect Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    } as any);
  });

  describe('HomePage Redirects', () => {
    it('should redirect unauthenticated users to login page', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should redirect authenticated users to dashboard', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: {
          _id: 'test-user',
          email: 'test@example.com',
          role: 'student',
          profile: { firstName: 'Test', lastName: 'User' },
        } as any,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(<HomePage />);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should not redirect while loading', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(<HomePage />);

      expect(mockPush).not.toHaveBeenCalled();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('ProtectedRoute Redirects', () => {
    const TestComponent = () => <div>Protected Content</div>;

    it('should redirect unauthenticated users to login page', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should redirect to custom fallback path when specified', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(
        <ProtectedRoute fallbackPath="/custom-login">
          <TestComponent />
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/custom-login');
      });
    });

    it('should render content for authenticated users', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: {
          _id: 'test-user',
          email: 'test@example.com',
          role: 'student',
          profile: { firstName: 'Test', lastName: 'User' },
        } as any,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should redirect to unauthorized page for insufficient role', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: {
          _id: 'test-user',
          email: 'test@example.com',
          role: 'student',
          profile: { firstName: 'Test', lastName: 'User' },
        } as any,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(
        <ProtectedRoute requiredRoles={['admin']}>
          <TestComponent />
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/unauthorized');
      });

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show loading spinner while authentication is loading', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
      // The loading spinner is rendered within the ProtectedRoute
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should not show loading spinner when showLoading is false', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(
        <ProtectedRoute showLoading={false}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Role-based Route Redirects', () => {
    const TestComponent = () => <div>Role-based Content</div>;

    it('should allow admin user to access admin routes', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: {
          _id: 'admin-user',
          email: 'admin@example.com',
          role: 'admin',
          profile: { firstName: 'Admin', lastName: 'User' },
        } as any,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(
        <ProtectedRoute requiredRoles={['admin']}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Role-based Content')).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should allow staff user to access staff routes', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: {
          _id: 'staff-user',
          email: 'staff@example.com',
          role: 'staff',
          profile: { firstName: 'Staff', lastName: 'User' },
        } as any,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(
        <ProtectedRoute requiredRoles={['admin', 'staff']}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Role-based Content')).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should deny student access to admin routes', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: {
          _id: 'student-user',
          email: 'student@example.com',
          role: 'student',
          profile: { firstName: 'Student', lastName: 'User' },
        } as any,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(
        <ProtectedRoute requiredRoles={['admin']}>
          <TestComponent />
        </ProtectedRoute>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/unauthorized');
      });

      expect(screen.queryByText('Role-based Content')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    const TestComponent = () => <div>Test Content</div>;

    it('should handle null user while authenticated', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: null,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(
        <ProtectedRoute requiredRoles={['student']}>
          <TestComponent />
        </ProtectedRoute>
      );

      // Should render content since no role validation can occur without user
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should handle empty required roles array', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: {
          _id: 'test-user',
          email: 'test@example.com',
          role: 'student',
          profile: { firstName: 'Test', lastName: 'User' },
        } as any,
        error: null,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        clearError: jest.fn(),
        checkAuth: jest.fn(),
      });

      render(
        <ProtectedRoute requiredRoles={[]}>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});