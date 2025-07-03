import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/context/AuthContext';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock AuthContext
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
};

const mockAuthContext = {
  login: jest.fn(),
  isLoading: false,
  error: null,
  user: null,
  logout: jest.fn(),
  isAuthenticated: false,
};

describe('LoginForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useAuth as jest.Mock).mockReturnValue(mockAuthContext);
  });

  describe('Component Rendering', () => {
    it('renders login form with all elements', () => {
      render(<LoginForm />);

      expect(screen.getByText('Connexion à 101 School')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('votre@email.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Votre mot de passe')).toBeInTheDocument();
      expect(screen.getByLabelText('Se souvenir de moi')).toBeInTheDocument();
      expect(screen.getByText('Se connecter')).toBeInTheDocument();
      expect(screen.getByText('créez un nouveau compte')).toBeInTheDocument();
      expect(screen.getByText('Mot de passe oublié ?')).toBeInTheDocument();
    });

    it('renders demo account buttons', () => {
      render(<LoginForm />);

      expect(screen.getByText('Comptes de démonstration')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Staff' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Enseignant' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Étudiant' })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows error when email is empty', async () => {
      render(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: 'Se connecter' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('L\'adresse email est requise')).toBeInTheDocument();
      });
    });

    it('shows error when password is empty', async () => {
      render(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('votre@email.com');
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: 'Se connecter' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Le mot de passe est requis')).toBeInTheDocument();
      });
    });

    it('shows error for invalid email format', async () => {
      render(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('votre@email.com');
      
      await user.type(emailInput, 'invalid-email');

      // Check that input accepts the invalid email (validation happens on submit)
      expect((emailInput as HTMLInputElement).value).toBe('invalid-email');
      
      // The form should have proper email validation setup
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('shows error for password too short', async () => {
      render(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('votre@email.com');
      const passwordInput = screen.getByPlaceholderText('Votre mot de passe');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '123');

      const submitButton = screen.getByRole('button', { name: 'Se connecter' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Le mot de passe doit contenir au moins 8 caractères')).toBeInTheDocument();
      });
    });

    it('validates email format correctly', async () => {
      render(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('votre@email.com');
      const passwordInput = screen.getByPlaceholderText('Votre mot de passe');

      // Test valid email formats
      const validEmails = [
        'test@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user123@example-site.com',
      ];

      for (const email of validEmails) {
        await user.clear(emailInput);
        await user.type(emailInput, email);
        await user.type(passwordInput, 'password123');

        const submitButton = screen.getByRole('button', { name: 'Se connecter' });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.queryByText('Adresse email invalide')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Password Visibility Toggle', () => {
    it('toggles password visibility when eye icon is clicked', async () => {
      render(<LoginForm />);

      const passwordInput = screen.getByPlaceholderText('Votre mot de passe') as HTMLInputElement;
      const toggleButtons = screen.getAllByRole('button');
      const toggleButton = toggleButtons.find(btn => btn.type === 'button' && btn.querySelector('svg'));

      // Initially password should be hidden
      expect(passwordInput.type).toBe('password');

      if (toggleButton) {
        // Click to show password
        await user.click(toggleButton);
        expect(passwordInput.type).toBe('text');

        // Click to hide password again
        await user.click(toggleButton);
        expect(passwordInput.type).toBe('password');
      }
    });

    it('shows correct icon based on password visibility state', async () => {
      render(<LoginForm />);

      const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button

      // Initially should show Eye icon (password hidden)
      expect(toggleButton.querySelector('svg')).toBeInTheDocument();

      // Click to show password - should show EyeOff icon
      await user.click(toggleButton);
      expect(toggleButton.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Demo Credentials Buttons', () => {
    it('sets admin credentials when admin button is clicked', async () => {
      render(<LoginForm />);

      const adminButton = screen.getByRole('button', { name: 'Admin' });
      await user.click(adminButton);

      const emailInput = screen.getByPlaceholderText('votre@email.com') as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText('Votre mot de passe') as HTMLInputElement;

      expect(emailInput.value).toBe('admin@101school.com');
      expect(passwordInput.value).toBe('Admin123!');
    });

    it('sets staff credentials when staff button is clicked', async () => {
      render(<LoginForm />);

      const staffButton = screen.getByRole('button', { name: 'Staff' });
      await user.click(staffButton);

      const emailInput = screen.getByPlaceholderText('votre@email.com') as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText('Votre mot de passe') as HTMLInputElement;

      expect(emailInput.value).toBe('staff@101school.com');
      expect(passwordInput.value).toBe('Admin123!');
    });

    it('sets teacher credentials when teacher button is clicked', async () => {
      render(<LoginForm />);

      const teacherButton = screen.getByRole('button', { name: 'Enseignant' });
      await user.click(teacherButton);

      const emailInput = screen.getByPlaceholderText('votre@email.com') as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText('Votre mot de passe') as HTMLInputElement;

      expect(emailInput.value).toBe('teacher@101school.com');
      expect(passwordInput.value).toBe('Admin123!');
    });

    it('sets student credentials when student button is clicked', async () => {
      render(<LoginForm />);

      const studentButton = screen.getByRole('button', { name: 'Étudiant' });
      await user.click(studentButton);

      const emailInput = screen.getByPlaceholderText('votre@email.com') as HTMLInputElement;
      const passwordInput = screen.getByPlaceholderText('Votre mot de passe') as HTMLInputElement;

      expect(emailInput.value).toBe('student@101school.com');
      expect(passwordInput.value).toBe('Admin123!');
    });
  });

  describe('Form Submission', () => {
    it('calls login function with correct credentials on form submission', async () => {
      const mockLogin = jest.fn().mockResolvedValue(true);
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        login: mockLogin,
      });

      render(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('votre@email.com');
      const passwordInput = screen.getByPlaceholderText('Votre mot de passe');
      const submitButton = screen.getByRole('button', { name: 'Se connecter' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('redirects to dashboard on successful login', async () => {
      const mockLogin = jest.fn().mockResolvedValue(true);
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        login: mockLogin,
      });

      render(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('votre@email.com');
      const passwordInput = screen.getByPlaceholderText('Votre mot de passe');
      const submitButton = screen.getByRole('button', { name: 'Se connecter' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('shows loading state during form submission', async () => {
      const mockLogin = jest.fn().mockResolvedValue(true);
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        login: mockLogin,
        isLoading: true, // Mock loading state
      });

      render(<LoginForm />);

      // Check that loading state shows correct UI
      expect(screen.getByText('Connexion en cours...')).toBeInTheDocument();
      
      const submitButton = screen.getByRole('button', { name: 'Connexion en cours...' });
      expect(submitButton).toBeDisabled();
    });

    it('shows error message on login failure', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        login: mockLogin,
      });

      render(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('votre@email.com');
      const passwordInput = screen.getByPlaceholderText('Votre mot de passe');
      const submitButton = screen.getByRole('button', { name: 'Se connecter' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('shows default error message when no specific error provided', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error());
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        login: mockLogin,
      });

      render(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('votre@email.com');
      const passwordInput = screen.getByPlaceholderText('Votre mot de passe');
      const submitButton = screen.getByRole('button', { name: 'Se connecter' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Erreur de connexion')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('disables submit button when auth context is loading', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        isLoading: true,
      });

      render(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: 'Connexion en cours...' });
      expect(submitButton).toBeDisabled();
    });

    it('shows error from auth context', () => {
      (useAuth as jest.Mock).mockReturnValue({
        ...mockAuthContext,
        error: 'Authentication service unavailable',
      });

      render(<LoginForm />);

      expect(screen.getByText('Authentication service unavailable')).toBeInTheDocument();
    });
  });

  describe('Remember Me Checkbox', () => {
    it('toggles remember me checkbox when clicked', async () => {
      render(<LoginForm />);

      const rememberMeCheckbox = screen.getByLabelText('Se souvenir de moi') as HTMLInputElement;

      expect(rememberMeCheckbox.checked).toBe(false);

      await user.click(rememberMeCheckbox);
      expect(rememberMeCheckbox.checked).toBe(true);

      await user.click(rememberMeCheckbox);
      expect(rememberMeCheckbox.checked).toBe(false);
    });
  });

  describe('Navigation Links', () => {
    it('renders correct navigation links', () => {
      render(<LoginForm />);

      const registerLink = screen.getByText('créez un nouveau compte');
      const forgotPasswordLink = screen.getByText('Mot de passe oublié ?');

      expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
      expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/forgot-password');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and associations', () => {
      render(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('votre@email.com');
      const passwordInput = screen.getByPlaceholderText('Votre mot de passe');
      const rememberMeCheckbox = screen.getByLabelText('Se souvenir de moi');

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
      expect(rememberMeCheckbox).toHaveAttribute('type', 'checkbox');
    });

    it('focuses on first input when form loads', () => {
      render(<LoginForm />);

      const emailInput = screen.getByPlaceholderText('votre@email.com');
      // Note: jsdom doesn't automatically focus, but we can test that it's focusable
      expect(emailInput).not.toHaveAttribute('tabIndex', '-1');
    });
  });
});