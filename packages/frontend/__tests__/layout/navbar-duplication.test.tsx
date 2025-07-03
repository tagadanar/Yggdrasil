import React from 'react';
import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import RootLayoutContent from '@/components/layout/RootLayoutContent';
import Layout from '@/components/layout/Layout';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock AuthContext
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    isLoading: false,
  }),
}));

// Mock Layout component to track render count and include Header/Sidebar
let layoutRenderCount = 0;
let headerRenderCount = 0;
let sidebarRenderCount = 0;

jest.mock('@/components/layout/Layout', () => {
  return function MockLayout({ children }: { children: React.ReactNode }) {
    layoutRenderCount++;
    headerRenderCount++;
    sidebarRenderCount++;
    
    return (
      <div data-testid="layout" data-render-count={layoutRenderCount}>
        <div data-testid="header" data-render-count={headerRenderCount}>Header</div>
        <div data-testid="sidebar" data-render-count={sidebarRenderCount}>Sidebar</div>
        {children}
      </div>
    );
  };
});

const mockUsePathname = usePathname as jest.Mock;


// Test component that simulates a page with Layout wrapper (incorrect usage)
const PageWithRedundantLayout: React.FC = () => {
  // This simulates the incorrect pattern we fixed
  return (
    <Layout>
      <div data-testid="page-content">Page Content</div>
    </Layout>
  );
};

// Test component that simulates a page without Layout wrapper (correct usage)
const PageWithoutLayout: React.FC = () => {
  return <div data-testid="page-content">Page Content</div>;
};

describe('Navbar Duplication Prevention Tests', () => {
  beforeEach(() => {
    // Reset render counts before each test
    layoutRenderCount = 0;
    headerRenderCount = 0;
    sidebarRenderCount = 0;
    jest.clearAllMocks();
  });

  describe('RootLayoutContent should handle layout rendering', () => {
    it('should render Layout only once for authenticated routes', () => {
      mockUsePathname.mockReturnValue('/dashboard');

      render(
        <RootLayoutContent>
          <PageWithoutLayout />
        </RootLayoutContent>
      );

      // Should render Layout exactly once
      const layouts = screen.getAllByTestId('layout');
      expect(layouts).toHaveLength(1);
      expect(layouts[0]).toHaveAttribute('data-render-count', '1');

      // Should render Header and Sidebar exactly once each
      const headers = screen.getAllByTestId('header');
      const sidebars = screen.getAllByTestId('sidebar');
      expect(headers).toHaveLength(1);
      expect(sidebars).toHaveLength(1);
      expect(headers[0]).toHaveAttribute('data-render-count', '1');
      expect(sidebars[0]).toHaveAttribute('data-render-count', '1');
    });

    it('should NOT render Layout for login/register routes', () => {
      mockUsePathname.mockReturnValue('/login');

      render(
        <RootLayoutContent>
          <PageWithoutLayout />
        </RootLayoutContent>
      );

      // Should not render Layout, Header, or Sidebar
      expect(screen.queryByTestId('layout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('header')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();

      // Should render page content directly
      expect(screen.getByTestId('page-content')).toBeInTheDocument();
    });

    it('should NOT render Layout for register route', () => {
      mockUsePathname.mockReturnValue('/register');

      render(
        <RootLayoutContent>
          <PageWithoutLayout />
        </RootLayoutContent>
      );

      // Should not render Layout, Header, or Sidebar
      expect(screen.queryByTestId('layout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('header')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
    });
  });

  describe('Double layout detection tests', () => {
    it('should detect double layout rendering (this test demonstrates the old bug)', () => {
      mockUsePathname.mockReturnValue('/dashboard');

      // This simulates what would happen if a page incorrectly wraps content with Layout
      // while RootLayoutContent also applies Layout
      render(
        <RootLayoutContent>
          <PageWithRedundantLayout />
        </RootLayoutContent>
      );

      // This test demonstrates the duplication problem we fixed
      // With redundant Layout wrappers, we get 2 layout components
      const layouts = screen.getAllByTestId('layout');
      expect(layouts).toHaveLength(2); // This shows the problem!
      
      // The render counts show the duplication
      expect(layouts[0]).toHaveAttribute('data-render-count', '1');
      expect(layouts[1]).toHaveAttribute('data-render-count', '2');
    });

    it('should ensure Header and Sidebar are rendered only once per page', () => {
      mockUsePathname.mockReturnValue('/dashboard');

      render(
        <RootLayoutContent>
          <PageWithoutLayout />
        </RootLayoutContent>
      );

      // Header should appear exactly once
      const headers = screen.getAllByTestId('header');
      expect(headers).toHaveLength(1);
      expect(headerRenderCount).toBe(1);

      // Sidebar should appear exactly once
      const sidebars = screen.getAllByTestId('sidebar');
      expect(sidebars).toHaveLength(1);
      expect(sidebarRenderCount).toBe(1);
    });
  });

  describe('Route-specific layout tests', () => {
    const authenticatedRoutes = [
      '/dashboard',
      '/users',
      '/courses',
      '/planning',
      '/news',
      '/statistics',
      '/activity',
      '/profile',
      '/settings'
    ];

    const unauthenticatedRoutes = [
      '/login',
      '/register'
    ];

    authenticatedRoutes.forEach(route => {
      it(`should render Layout exactly once for ${route}`, () => {
        mockUsePathname.mockReturnValue(route);

        render(
          <RootLayoutContent>
            <PageWithoutLayout />
          </RootLayoutContent>
        );

        const layouts = screen.getAllByTestId('layout');
        expect(layouts).toHaveLength(1);
        expect(layoutRenderCount).toBe(1);
      });
    });

    unauthenticatedRoutes.forEach(route => {
      it(`should NOT render Layout for ${route}`, () => {
        mockUsePathname.mockReturnValue(route);

        render(
          <RootLayoutContent>
            <PageWithoutLayout />
          </RootLayoutContent>
        );

        expect(screen.queryByTestId('layout')).not.toBeInTheDocument();
        expect(layoutRenderCount).toBe(0);
      });
    });
  });

  describe('Component uniqueness assertions', () => {
    it('should ensure navigation components are unique in DOM', () => {
      mockUsePathname.mockReturnValue('/dashboard');

      render(
        <RootLayoutContent>
          <PageWithoutLayout />
        </RootLayoutContent>
      );

      // Test that there's only one of each navigation component
      expect(screen.getAllByTestId('header')).toHaveLength(1);
      expect(screen.getAllByTestId('sidebar')).toHaveLength(1);
      expect(screen.getAllByTestId('layout')).toHaveLength(1);
    });

    it('should fail if multiple navigation components exist', () => {
      mockUsePathname.mockReturnValue('/dashboard');

      render(
        <RootLayoutContent>
          <PageWithoutLayout />
        </RootLayoutContent>
      );

      // These assertions would catch navbar duplication
      const headers = screen.getAllByTestId('header');
      const sidebars = screen.getAllByTestId('sidebar');
      
      // Should never have more than one of each
      expect(headers.length).toBeLessThanOrEqual(1);
      expect(sidebars.length).toBeLessThanOrEqual(1);
      
      // Should have exactly one of each for authenticated routes
      expect(headers).toHaveLength(1);
      expect(sidebars).toHaveLength(1);
    });
  });

  describe('Regression prevention', () => {
    it('should prevent future navbar duplication bugs', () => {
      // This test documents the expected behavior and would catch any regression
      // where pages start including Layout wrapper again
      
      mockUsePathname.mockReturnValue('/dashboard');

      const { container } = render(
        <RootLayoutContent>
          <div data-testid="page-content">Dashboard Content</div>
        </RootLayoutContent>
      );

      // Count all layout-related elements in the DOM
      const layoutElements = container.querySelectorAll('[data-testid="layout"]');
      const headerElements = container.querySelectorAll('[data-testid="header"]');
      const sidebarElements = container.querySelectorAll('[data-testid="sidebar"]');

      // Should have exactly one of each navigation component
      expect(layoutElements).toHaveLength(1);
      expect(headerElements).toHaveLength(1);
      expect(sidebarElements).toHaveLength(1);

      // Page content should be present
      expect(screen.getByTestId('page-content')).toBeInTheDocument();
    });
  });
});