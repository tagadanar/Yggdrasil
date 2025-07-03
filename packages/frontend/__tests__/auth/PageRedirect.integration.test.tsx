import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Import all protected pages
import DashboardPage from '@/app/dashboard/page';
import ActivityPage from '@/app/activity/page';
import ProfilePage from '@/app/profile/page';
import SettingsPage from '@/app/settings/page';
import UsersPage from '@/app/users/page';
import StatisticsPage from '@/app/statistics/page';
import CoursesPage from '@/app/courses/page';
import PlanningPage from '@/app/planning/page';
import NewsPage from '@/app/news/page';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: () => ({ id: 'test-id' }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/test-path',
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/utils/api', () => ({
  userAPI: {
    updateProfile: jest.fn().mockResolvedValue({ success: true }),
    uploadPhoto: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock all the complex components to avoid rendering issues
jest.mock('@/components/dashboard/Dashboard', () => {
  return function MockDashboard() {
    return <div>Dashboard Component</div>;
  };
});

jest.mock('@/components/users/UserManagement', () => {
  return function MockUserManagement() {
    return <div>User Management Component</div>;
  };
});

jest.mock('@/components/statistics/StatisticsDashboard', () => ({
  StatisticsDashboard: function MockStatisticsDashboard() {
    return <div>Statistics Dashboard Component</div>;
  },
}));

jest.mock('@/components/planning/CalendarView', () => ({
  CalendarView: function MockCalendarView() {
    return <div>Calendar View Component</div>;
  },
}));

jest.mock('@/components/news/NewsList', () => ({
  NewsList: function MockNewsList() {
    return <div>News List Component</div>;
  },
}));

jest.mock('@/components/layout/Layout', () => {
  return function MockLayout({ children }: { children: React.ReactNode }) {
    return <div data-testid="layout">{children}</div>;
  };
});

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('Page Redirect Integration Tests', () => {
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

  const unauthenticatedAuthState = {
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
  };

  const authenticatedAuthState = {
    isAuthenticated: true,
    isLoading: false,
    user: {
      _id: 'test-user',
      email: 'test@example.com',
      role: 'admin' as const,
      profile: { firstName: 'Test', lastName: 'User' },
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    error: null,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    clearError: jest.fn(),
    checkAuth: jest.fn(),
    updateUser: jest.fn(),
  };

  describe('Unauthenticated User Redirects', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(unauthenticatedAuthState);
    });

    it('should redirect from dashboard to login', async () => {
      render(<DashboardPage />);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should redirect from activity to login', async () => {
      render(<ActivityPage />);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should redirect from profile to login', async () => {
      render(<ProfilePage />);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should redirect from settings to login', async () => {
      render(<SettingsPage />);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should redirect from users to login', async () => {
      render(<UsersPage />);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should redirect from statistics to login', async () => {
      render(<StatisticsPage />);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should redirect from courses to login', async () => {
      render(<CoursesPage />);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should redirect from planning to login', async () => {
      render(<PlanningPage />);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should redirect from news to login', async () => {
      render(<NewsPage />);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Authenticated User Access', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue(authenticatedAuthState);
    });

    it('should allow access to dashboard for authenticated users', async () => {
      const { getByTestId } = render(<DashboardPage />);
      
      // Should render content, not redirect
      expect(mockPush).not.toHaveBeenCalled();
      expect(getByTestId('layout')).toBeInTheDocument();
    });

    it('should allow access to activity for authenticated users', async () => {
      const { getByTestId } = render(<ActivityPage />);
      
      expect(mockPush).not.toHaveBeenCalled();
      expect(getByTestId('layout')).toBeInTheDocument();
    });

    it('should allow access to profile for authenticated users', async () => {
      const { getByTestId } = render(<ProfilePage />);
      
      expect(mockPush).not.toHaveBeenCalled();
      expect(getByTestId('layout')).toBeInTheDocument();
    });

    it('should allow access to settings for authenticated users', async () => {
      const { getByTestId } = render(<SettingsPage />);
      
      expect(mockPush).not.toHaveBeenCalled();
      expect(getByTestId('layout')).toBeInTheDocument();
    });

    it('should allow access to users for admin users', async () => {
      const { getByTestId } = render(<UsersPage />);
      
      expect(mockPush).not.toHaveBeenCalled();
      expect(getByTestId('layout')).toBeInTheDocument();
    });

    it('should allow access to statistics for authenticated users', async () => {
      const { getByTestId } = render(<StatisticsPage />);
      
      expect(mockPush).not.toHaveBeenCalled();
      expect(getByTestId('layout')).toBeInTheDocument();
    });

    it('should allow access to courses for authenticated users', async () => {
      const { getByTestId } = render(<CoursesPage />);
      
      expect(mockPush).not.toHaveBeenCalled();
      expect(getByTestId('layout')).toBeInTheDocument();
    });

    it('should allow access to planning for authenticated users', async () => {
      const { getByTestId } = render(<PlanningPage />);
      
      expect(mockPush).not.toHaveBeenCalled();
      expect(getByTestId('layout')).toBeInTheDocument();
    });

    it('should allow access to news for authenticated users', async () => {
      const { getByTestId } = render(<NewsPage />);
      
      expect(mockPush).not.toHaveBeenCalled();
      expect(getByTestId('layout')).toBeInTheDocument();
    });
  });

  describe('Role-based Access Control', () => {
    it('should redirect student from admin-only users page', async () => {
      mockUseAuth.mockReturnValue({
        ...authenticatedAuthState,
        user: {
          ...authenticatedAuthState.user,
          role: 'student' as const,
        },
      });

      render(<UsersPage />);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/unauthorized');
      });
    });

    it('should allow staff access to users page', async () => {
      mockUseAuth.mockReturnValue({
        ...authenticatedAuthState,
        user: {
          ...authenticatedAuthState.user,
          role: 'staff' as const,
        },
      });

      const { getByTestId } = render(<UsersPage />);
      
      expect(mockPush).not.toHaveBeenCalled();
      expect(getByTestId('layout')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state and not redirect while authentication is loading', () => {
      mockUseAuth.mockReturnValue({
        ...unauthenticatedAuthState,
        isLoading: true,
      });

      render(<DashboardPage />);
      
      // Should not redirect while loading
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});