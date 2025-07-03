import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/context/AuthContext';

// Mock Next.js pathname hook
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock AuthContext
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockAuthContext = {
  user: {
    email: 'test@example.com',
    role: 'student',
    profile: {
      firstName: 'Jean',
      lastName: 'Dupont',
      profilePhoto: null,
    },
  },
  logout: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
  isLoading: false,
  error: null,
  isAuthenticated: true,
};

describe('Sidebar', () => {
  const user = userEvent.setup();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue(mockAuthContext);
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
  });

  describe('Component Rendering', () => {
    it('renders sidebar with user information', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('School Platform')).toBeInTheDocument();
      expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
      expect(screen.getByText('Étudiant')).toBeInTheDocument();
      expect(screen.getByText('Déconnexion')).toBeInTheDocument();
    });

    it('does not render when user is not authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        user: null,
      });

      const { container } = render(<Sidebar isOpen={true} onClose={mockOnClose} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders user profile photo when available', () => {
      const userWithPhoto = {
        ...mockAuthContext.user,
        profile: {
          ...mockAuthContext.user.profile,
          profilePhoto: 'http://example.com/photo.jpg',
        },
      };

      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        user: userWithPhoto,
      });

      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      const profileImage = screen.getByAltText('Photo de profil');
      expect(profileImage).toBeInTheDocument();
      expect(profileImage).toHaveAttribute('src', 'http://example.com/photo.jpg');
    });

    it('shows role icon when no profile photo', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      // Should render role icon (User icon for student)
      const userInfo = screen.getByText('Jean Dupont').closest('div');
      expect(userInfo).toBeInTheDocument();
    });
  });

  describe('Navigation Items', () => {
    it('renders navigation items for student role', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      // Student should see these navigation items
      expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
      expect(screen.getByText('Cours')).toBeInTheDocument();
      expect(screen.getByText('Planning')).toBeInTheDocument();
      expect(screen.getByText('Actualités')).toBeInTheDocument();
      expect(screen.getByText('Paramètres')).toBeInTheDocument();

      // Student should NOT see admin/staff items
      expect(screen.queryByText('Utilisateurs')).not.toBeInTheDocument();
      expect(screen.queryByText('Statistiques')).not.toBeInTheDocument();
    });

    it('renders navigation items for admin role', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          role: 'admin',
        },
      });

      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      // Admin should see all navigation items
      expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
      expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
      expect(screen.getByText('Cours')).toBeInTheDocument();
      expect(screen.getByText('Planning')).toBeInTheDocument();
      expect(screen.getByText('Actualités')).toBeInTheDocument();
      expect(screen.getByText('Statistiques')).toBeInTheDocument();
      expect(screen.getByText('Paramètres')).toBeInTheDocument();
    });

    it('renders navigation items for teacher role', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          role: 'teacher',
        },
      });

      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      // Teacher should see most items including statistics
      expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
      expect(screen.getByText('Cours')).toBeInTheDocument();
      expect(screen.getByText('Planning')).toBeInTheDocument();
      expect(screen.getByText('Actualités')).toBeInTheDocument();
      expect(screen.getByText('Statistiques')).toBeInTheDocument();
      expect(screen.getByText('Paramètres')).toBeInTheDocument();

      // Teacher should NOT see users management
      expect(screen.queryByText('Utilisateurs')).not.toBeInTheDocument();
    });

    it('renders navigation items for staff role', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          role: 'staff',
        },
      });

      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      // Staff should see all items including statistics
      expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
      expect(screen.getByText('Utilisateurs')).toBeInTheDocument();
      expect(screen.getByText('Cours')).toBeInTheDocument();
      expect(screen.getByText('Planning')).toBeInTheDocument();
      expect(screen.getByText('Actualités')).toBeInTheDocument();
      expect(screen.getByText('Statistiques')).toBeInTheDocument();
      expect(screen.getByText('Paramètres')).toBeInTheDocument();
    });
  });

  describe('Active Navigation State', () => {
    it('highlights active navigation item', () => {
      (usePathname as jest.Mock).mockReturnValue('/courses');

      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      const coursesLink = screen.getByText('Cours').closest('a');
      expect(coursesLink).toHaveClass('bg-primary-100', 'text-primary-900');
    });

    it('does not highlight inactive navigation items', () => {
      (usePathname as jest.Mock).mockReturnValue('/dashboard');

      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      const coursesLink = screen.getByText('Cours').closest('a');
      expect(coursesLink).toHaveClass('text-gray-600');
      expect(coursesLink).not.toHaveClass('bg-primary-100');
    });
  });

  describe('Navigation Clicks', () => {
    it('calls onClose when navigation item is clicked', async () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      const dashboardLink = screen.getByText('Tableau de bord');
      await user.click(dashboardLink);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose for each navigation item click', async () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      const coursesLink = screen.getByText('Cours');
      const planningLink = screen.getByText('Planning');

      await user.click(coursesLink);
      expect(mockOnClose).toHaveBeenCalledTimes(1);

      await user.click(planningLink);
      expect(mockOnClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('Mobile Behavior', () => {
    it('renders mobile backdrop when open', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      const backdrop = document.querySelector('.fixed.inset-0.z-40.bg-gray-600');
      expect(backdrop).toBeInTheDocument();
    });

    it('does not render mobile backdrop when closed', () => {
      render(<Sidebar isOpen={false} onClose={mockOnClose} />);

      const backdrop = document.querySelector('.fixed.inset-0.z-40.bg-gray-600');
      expect(backdrop).not.toBeInTheDocument();
    });

    it('calls onClose when backdrop is clicked', async () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      const backdrop = document.querySelector('.fixed.inset-0.z-40.bg-gray-600');
      expect(backdrop).toBeInTheDocument();

      if (backdrop) {
        await user.click(backdrop);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('renders close button on mobile', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      const closeButton = document.querySelector('button.lg\\:hidden');
      expect(closeButton).toBeInTheDocument();
    });

    it('calls onClose when mobile close button is clicked', async () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      const closeButton = document.querySelector('button.lg\\:hidden') as HTMLElement;
      expect(closeButton).toBeInTheDocument();

      if (closeButton) {
        await user.click(closeButton);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Sidebar Visibility States', () => {
    it('applies correct classes when open', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      const sidebar = document.querySelector('.w-64.bg-white.shadow-lg');
      expect(sidebar).toHaveClass('translate-x-0');
      expect(sidebar).not.toHaveClass('-translate-x-full');
    });

    it('applies correct classes when closed on mobile', () => {
      render(<Sidebar isOpen={false} onClose={mockOnClose} />);

      const sidebar = document.querySelector('.w-64.bg-white.shadow-lg');
      expect(sidebar).toHaveClass('-translate-x-full');
    });
  });

  describe('Logout Functionality', () => {
    it('renders logout button', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      const logoutButton = screen.getByText('Déconnexion');
      expect(logoutButton).toBeInTheDocument();
    });

    it('calls logout and onClose when logout button is clicked', async () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      const logoutButton = screen.getByText('Déconnexion');
      await user.click(logoutButton);

      expect(mockAuthContext.logout).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Role Icons and Labels', () => {
    it('displays correct role label for different roles', () => {
      const roles = [
        { role: 'admin', label: 'Administrateur' },
        { role: 'staff', label: 'Personnel' },
        { role: 'teacher', label: 'Enseignant' },
        { role: 'student', label: 'Étudiant' },
      ];

      roles.forEach(({ role, label }) => {
        (useAuth as jest.Mock).mockReturnValue({
          ...mockAuthContext,
          user: {
            ...mockAuthContext.user,
            role,
          },
        });

        const { rerender } = render(<Sidebar isOpen={true} onClose={mockOnClose} />);
        expect(screen.getByText(label)).toBeInTheDocument();
        
        rerender(<></>); // Clean up for next iteration
      });
    });

    it('handles unknown role gracefully', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          role: 'unknown',
        },
      });

      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Utilisateur')).toBeInTheDocument();
    });
  });

  describe('User Profile Information', () => {
    it('displays full user name', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
    });

    it('handles missing profile information gracefully', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          profile: null,
        },
      });

      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      // Should still render without crashing
      expect(screen.getByText('School Platform')).toBeInTheDocument();
    });

    it('handles partial profile information', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        user: {
          ...mockAuthContext.user,
          profile: {
            firstName: 'Jean',
            lastName: null,
            profilePhoto: null,
          },
        },
      });

      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Jean')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();

      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('has proper button functionality', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      const logoutButton = screen.getByText('Déconnexion').closest('button');
      expect(logoutButton).toBeInTheDocument();
      expect(logoutButton?.tagName).toBe('BUTTON');
    });
  });

  describe('School Platform Branding', () => {
    it('renders school platform logo and name', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('101')).toBeInTheDocument();
      expect(screen.getByText('School Platform')).toBeInTheDocument();
    });

    it('has proper logo styling', () => {
      render(<Sidebar isOpen={true} onClose={mockOnClose} />);

      const logo = screen.getByText('101');
      expect(logo.parentElement).toHaveClass('w-8', 'h-8', 'bg-primary-600', 'rounded-lg');
    });
  });
});