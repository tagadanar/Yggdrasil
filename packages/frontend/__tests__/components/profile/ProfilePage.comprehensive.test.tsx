import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from '@/app/profile/page';
import { userAPI } from '@/utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

// Mock dependencies
jest.mock('@/utils/api');
jest.mock('react-hot-toast');
jest.mock('@/components/auth/ProtectedRoute', () => {
  return function MockProtectedRoute({ children }: { children: React.ReactNode }) {
    return <div data-testid="protected-route">{children}</div>;
  };
});
jest.mock('next/link', () => {
  return function MockLink({ href, children, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn()
}));

const mockUser = {
  _id: '123',
  email: 'test@example.com',
  role: 'student',
  isActive: true,
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
  lastLogin: '2023-01-01T00:00:00.000Z',
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    phone: '123-456-7890',
    bio: 'Test bio',
    department: 'IT',
    studentId: 'S123456',
    profilePhoto: 'https://example.com/photo.jpg'
  }
};

const mockUpdateUser = jest.fn();

describe('ProfilePage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Configure mocks
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      updateUser: mockUpdateUser
    });
    
    (userAPI.updateProfile as jest.Mock).mockResolvedValue({ 
      success: true, 
      data: { ...mockUser, profile: { ...mockUser.profile, firstName: 'Updated' } }
    });
    (userAPI.uploadPhoto as jest.Mock).mockResolvedValue({ 
      success: true, 
      data: { photoUrl: 'https://example.com/new-photo.jpg' }
    });
    (toast.success as jest.Mock).mockImplementation(() => 'success-toast-id');
    (toast.error as jest.Mock).mockImplementation(() => 'error-toast-id');
  });

  describe('Basic Rendering', () => {
    it('should render component without errors', () => {
      expect(() => {
        render(<ProfilePage />);
      }).not.toThrow();
    });

    it('should render loading state when user is null', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        updateUser: mockUpdateUser
      });
      
      render(<ProfilePage />);
      expect(screen.getByText('Chargement...')).toBeInTheDocument();
    });

    it('should render user profile information', () => {
      render(<ProfilePage />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('123-456-7890')).toBeInTheDocument();
      expect(screen.getByText('Test bio')).toBeInTheDocument();
    });
  });

  describe('Profile Editing', () => {
    it('should enter edit mode when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);
      
      const editButton = screen.getByText('Modifier');
      await user.click(editButton);
      
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByText('Enregistrer')).toBeInTheDocument();
      expect(screen.getByText('Annuler')).toBeInTheDocument();
    });

    it('should save profile changes', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);
      
      // Enter edit mode
      await user.click(screen.getByText('Modifier'));
      
      // Update first name
      const firstNameInput = screen.getByDisplayValue('John');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');
      
      // Save changes
      await user.click(screen.getByText('Enregistrer'));
      
      await waitFor(() => {
        expect(userAPI.updateProfile).toHaveBeenCalledWith('123', {
          profile: expect.objectContaining({
            firstName: 'Jane'
          })
        });
      });
      
      expect(toast.success).toHaveBeenCalledWith('Profil mis à jour avec succès');
    });

    it('should cancel editing and reset form', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);
      
      // Enter edit mode
      await user.click(screen.getByText('Modifier'));
      
      // Update first name
      const firstNameInput = screen.getByDisplayValue('John');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');
      
      // Cancel changes
      await user.click(screen.getByText('Annuler'));
      
      // Should exit edit mode and reset form
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('Modifier')).toBeInTheDocument();
    });
  });

  describe('Photo Upload', () => {
    it('should handle photo upload', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
      
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(userAPI.uploadPhoto).toHaveBeenCalledWith(file);
      });
      
      expect(toast.success).toHaveBeenCalledWith('Photo de profil mise à jour');
    });

    it('should handle photo upload error for invalid file type', async () => {
      render(<ProfilePage />);
      
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Veuillez sélectionner une image valide');
      });
    });

    it('should handle photo upload error for large file', async () => {
      const user = userEvent.setup();
      render(<ProfilePage />);
      
      // Create a file larger than 5MB
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });
      
      const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
      
      await user.upload(fileInput, largeFile);
      
      expect(toast.error).toHaveBeenCalledWith('L\'image doit faire moins de 5MB');
    });
  });

  describe('Role-specific Display', () => {
    it('should display student-specific fields for student role', () => {
      render(<ProfilePage />);
      
      expect(screen.getByText('Numéro d\'étudiant')).toBeInTheDocument();
      expect(screen.getByText('S123456')).toBeInTheDocument();
      expect(screen.getByText('Mes cours')).toBeInTheDocument();
    });

    it('should display department field for teacher role', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { ...mockUser, role: 'teacher' },
        updateUser: mockUpdateUser
      });
      
      render(<ProfilePage />);
      
      expect(screen.getByText('Département')).toBeInTheDocument();
      expect(screen.getByText('IT')).toBeInTheDocument();
    });

    it('should display correct role badge', () => {
      render(<ProfilePage />);
      
      expect(screen.getByText('Étudiant')).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('should display active status', () => {
      render(<ProfilePage />);
      
      expect(screen.getByText('Compte actif')).toBeInTheDocument();
    });

    it('should display inactive status', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { ...mockUser, isActive: false },
        updateUser: mockUpdateUser
      });
      
      render(<ProfilePage />);
      
      expect(screen.getByText('Compte inactif')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle profile update error', async () => {
      const user = userEvent.setup();
      (userAPI.updateProfile as jest.Mock).mockResolvedValue({ 
        success: false, 
        error: 'Update failed' 
      });
      
      render(<ProfilePage />);
      
      await user.click(screen.getByText('Modifier'));
      await user.click(screen.getByText('Enregistrer'));
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Update failed');
      });
    });

    it('should handle photo upload error', async () => {
      const user = userEvent.setup();
      (userAPI.uploadPhoto as jest.Mock).mockResolvedValue({ 
        success: false, 
        error: 'Upload failed' 
      });
      
      render(<ProfilePage />);
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
      
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Upload failed');
      });
    });
  });

  describe('Component Structure', () => {
    it('should render with protected route wrapper', () => {
      render(<ProfilePage />);
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
    });

    it('should have proper navigation links', () => {
      render(<ProfilePage />);
      
      expect(screen.getByText('Modifier le profil')).toBeInTheDocument();
      expect(screen.getByText('Voir tout')).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('should have user API methods available', () => {
      expect(userAPI.updateProfile).toBeDefined();
      expect(userAPI.uploadPhoto).toBeDefined();
    });
  });

  describe('Toast Integration', () => {
    it('should have toast methods available', () => {
      expect(toast.success).toBeDefined();
      expect(toast.error).toBeDefined();
    });
  });
});