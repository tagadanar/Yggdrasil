import React from 'react';
import { render, screen } from '@testing-library/react';
import RootLayoutContent from '@/components/layout/RootLayoutContent';
import Layout from '@/components/layout/Layout';

// Mock Layout component
jest.mock('@/components/layout/Layout', () => {
  return jest.fn(({ children }) => (
    <div data-testid="layout">
      <div data-testid="layout-content">{children}</div>
    </div>
  ));
});

// Mock usePathname with more control
const mockUsePathname = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('RootLayoutContent', () => {
  const TestContent = () => <div data-testid="test-content">Test Content</div>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when on non-sidebar routes', () => {
    it('should render children without Layout on /login', () => {
      mockUsePathname.mockReturnValue('/login');

      render(
        <RootLayoutContent>
          <TestContent />
        </RootLayoutContent>
      );

      // Should render content directly without layout
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.queryByTestId('layout')).not.toBeInTheDocument();
      expect(Layout).not.toHaveBeenCalled();
    });

    it('should render children without Layout on /register', () => {
      mockUsePathname.mockReturnValue('/register');

      render(
        <RootLayoutContent>
          <TestContent />
        </RootLayoutContent>
      );

      // Should render content directly without layout
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.queryByTestId('layout')).not.toBeInTheDocument();
      expect(Layout).not.toHaveBeenCalled();
    });
  });

  describe('when on sidebar routes', () => {
    it('should render children with Layout on /dashboard', () => {
      mockUsePathname.mockReturnValue('/dashboard');

      render(
        <RootLayoutContent>
          <TestContent />
        </RootLayoutContent>
      );

      // Should render content within layout
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByTestId('layout')).toBeInTheDocument();
      expect(screen.getByTestId('layout-content')).toBeInTheDocument();
      expect(Layout).toHaveBeenCalledWith(
        expect.objectContaining({
          children: expect.anything(),
        }),
        {}
      );
    });

    it('should render children with Layout on /users', () => {
      mockUsePathname.mockReturnValue('/users');

      render(
        <RootLayoutContent>
          <TestContent />
        </RootLayoutContent>
      );

      // Should render content within layout
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByTestId('layout')).toBeInTheDocument();
      expect(Layout).toHaveBeenCalled();
    });

    it('should render children with Layout on /courses', () => {
      mockUsePathname.mockReturnValue('/courses');

      render(
        <RootLayoutContent>
          <TestContent />
        </RootLayoutContent>
      );

      // Should render content within layout
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByTestId('layout')).toBeInTheDocument();
      expect(Layout).toHaveBeenCalled();
    });

    it('should render children with Layout on /news', () => {
      mockUsePathname.mockReturnValue('/news');

      render(
        <RootLayoutContent>
          <TestContent />
        </RootLayoutContent>
      );

      // Should render content within layout
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByTestId('layout')).toBeInTheDocument();
      expect(Layout).toHaveBeenCalled();
    });

    it('should render children with Layout on /statistics', () => {
      mockUsePathname.mockReturnValue('/statistics');

      render(
        <RootLayoutContent>
          <TestContent />
        </RootLayoutContent>
      );

      // Should render content within layout
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByTestId('layout')).toBeInTheDocument();
      expect(Layout).toHaveBeenCalled();
    });

    it('should render children with Layout on /planning', () => {
      mockUsePathname.mockReturnValue('/planning');

      render(
        <RootLayoutContent>
          <TestContent />
        </RootLayoutContent>
      );

      // Should render content within layout
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByTestId('layout')).toBeInTheDocument();
      expect(Layout).toHaveBeenCalled();
    });

    it('should render children with Layout on /settings', () => {
      mockUsePathname.mockReturnValue('/settings');

      render(
        <RootLayoutContent>
          <TestContent />
        </RootLayoutContent>
      );

      // Should render content within layout
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByTestId('layout')).toBeInTheDocument();
      expect(Layout).toHaveBeenCalled();
    });

    it('should render children with Layout on unknown routes', () => {
      mockUsePathname.mockReturnValue('/some-unknown-route');

      render(
        <RootLayoutContent>
          <TestContent />
        </RootLayoutContent>
      );

      // Should render content within layout for unknown routes
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByTestId('layout')).toBeInTheDocument();
      expect(Layout).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle multiple children correctly with Layout', () => {
      mockUsePathname.mockReturnValue('/dashboard');

      render(
        <RootLayoutContent>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </RootLayoutContent>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('layout')).toBeInTheDocument();
      expect(Layout).toHaveBeenCalled();
    });

    it('should handle multiple children correctly without Layout', () => {
      mockUsePathname.mockReturnValue('/login');

      render(
        <RootLayoutContent>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </RootLayoutContent>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.queryByTestId('layout')).not.toBeInTheDocument();
      expect(Layout).not.toHaveBeenCalled();
    });

    it('should handle empty children', () => {
      mockUsePathname.mockReturnValue('/dashboard');

      render(<RootLayoutContent>{null}</RootLayoutContent>);

      expect(screen.getByTestId('layout')).toBeInTheDocument();
      expect(Layout).toHaveBeenCalledWith(
        expect.objectContaining({
          children: null,
        }),
        {}
      );
    });

    it('should handle route changes correctly', () => {
      mockUsePathname.mockReturnValue('/login');

      const { rerender } = render(
        <RootLayoutContent>
          <TestContent />
        </RootLayoutContent>
      );

      // Initially on login - no layout
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.queryByTestId('layout')).not.toBeInTheDocument();

      // Change to dashboard route
      mockUsePathname.mockReturnValue('/dashboard');
      
      rerender(
        <RootLayoutContent>
          <TestContent />
        </RootLayoutContent>
      );

      // Now should have layout
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });
  });

  describe('NO_SIDEBAR_ROUTES configuration', () => {
    it('should correctly identify all no-sidebar routes', () => {
      const noSidebarRoutes = ['/login', '/register'];
      
      noSidebarRoutes.forEach(route => {
        mockUsePathname.mockReturnValue(route);
        
        const { unmount } = render(
          <RootLayoutContent>
            <TestContent />
          </RootLayoutContent>
        );

        expect(screen.getByTestId('test-content')).toBeInTheDocument();
        expect(screen.queryByTestId('layout')).not.toBeInTheDocument();
        
        unmount();
        jest.clearAllMocks();
      });
    });

    it('should treat sub-routes differently from main routes', () => {
      // Sub-routes should still show layout
      mockUsePathname.mockReturnValue('/login/forgot-password');

      render(
        <RootLayoutContent>
          <TestContent />
        </RootLayoutContent>
      );

      // Should render with layout since it's not exactly '/login'
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByTestId('layout')).toBeInTheDocument();
      expect(Layout).toHaveBeenCalled();
    });
  });
});