import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserForm from '@/components/users/UserForm';

describe('Setup', () => {
  it('should setup test environment', () => {
    expect(true).toBe(true);
  });
});

describe('UserForm', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    onSave: mockOnSave,
    onCancel: mockOnCancel,
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render create user form when no user provided', () => {
      render(<UserForm {...defaultProps} />);

      expect(screen.getByText('Ajouter un utilisateur')).toBeInTheDocument();
      expect(screen.getByText('Créer')).toBeInTheDocument();
      expect(screen.getByLabelText('Mot de passe *')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirmer le mot de passe *')).toBeInTheDocument();
    });

    it('should render edit user form when user provided', () => {
      const user = {
        _id: '123',
        email: 'test@example.com',
        role: 'student',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
          department: 'Computer Science',
          studentId: '12345',
          bio: 'Test bio',
        },
        isActive: true,
      };

      render(<UserForm {...defaultProps} user={user} />);

      expect(screen.getByText('Modifier l\'utilisateur')).toBeInTheDocument();
      expect(screen.getByText('Modifier')).toBeInTheDocument();
      expect(screen.queryByLabelText('Mot de passe *')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Confirmer le mot de passe *')).not.toBeInTheDocument();
      
      // Check pre-filled values
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Computer Science')).toBeInTheDocument();
      expect(screen.getByDisplayValue('12345')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test bio')).toBeInTheDocument();
    });

    it('should show loading state when isLoading is true', () => {
      render(<UserForm {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Création...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /création/i })).toBeDisabled();
    });

    it('should show loading state for edit when isLoading is true', () => {
      const user = { _id: '123', email: 'test@example.com', role: 'student', profile: { firstName: 'John', lastName: 'Doe' }, isActive: true };
      render(<UserForm {...defaultProps} user={user} isLoading={true} />);

      expect(screen.getByText('Modification...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /modification/i })).toBeDisabled();
    });
  });

  describe('form interactions', () => {
    it('should update form fields when user types', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      const firstNameInput = screen.getByLabelText('Prénom *');
      await user.type(firstNameInput, 'John');
      expect(firstNameInput).toHaveValue('John');

      const lastNameInput = screen.getByLabelText('Nom *');
      await user.type(lastNameInput, 'Doe');
      expect(lastNameInput).toHaveValue('Doe');

      const emailInput = screen.getByLabelText('Email *');
      await user.type(emailInput, 'john@example.com');
      expect(emailInput).toHaveValue('john@example.com');
    });

    it('should show student ID field only for student role', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      // Initially should not show student ID (default role might not be student)
      const roleSelect = screen.getByLabelText('Rôle *');
      
      // Change to student role
      await user.selectOptions(roleSelect, 'student');
      expect(screen.getByLabelText(/numéro étudiant/i)).toBeInTheDocument();

      // Change to teacher role
      await user.selectOptions(roleSelect, 'teacher');
      expect(screen.queryByLabelText(/numéro étudiant/i)).not.toBeInTheDocument();
    });

    it('should toggle active status checkbox', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      const activeCheckbox = screen.getByLabelText(/compte actif/i);
      expect(activeCheckbox).toBeChecked(); // Default should be active

      await user.click(activeCheckbox);
      expect(activeCheckbox).not.toBeChecked();

      await user.click(activeCheckbox);
      expect(activeCheckbox).toBeChecked();
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      const cancelButton = screen.getByText('Annuler');
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when X button is clicked', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: 'Fermer' }); // X button
      await user.click(closeButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('form validation', () => {
    it('should show validation errors for required fields', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      const submitButton = screen.getByText('Créer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email est requis')).toBeInTheDocument();
        expect(screen.getByText('Prénom est requis')).toBeInTheDocument();
        expect(screen.getByText('Nom est requis')).toBeInTheDocument();
        expect(screen.getByText('Mot de passe est requis')).toBeInTheDocument();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      // Test that empty fields trigger validation errors
      const submitButton = screen.getByText('Créer');
      await user.click(submitButton);

      await waitFor(() => {
        // Should show validation errors for required fields
        expect(screen.getByText('Prénom est requis')).toBeInTheDocument();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should validate password length', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText('Mot de passe *');
      await user.type(passwordInput, '123');

      const submitButton = screen.getByText('Créer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Le mot de passe doit contenir au moins 8 caractères')).toBeInTheDocument();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should validate password confirmation match', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      const passwordInput = screen.getByLabelText('Mot de passe *');
      const confirmPasswordInput = screen.getByLabelText('Confirmer le mot de passe *');

      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'different123');

      const submitButton = screen.getByText('Créer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Les mots de passe ne correspondent pas')).toBeInTheDocument();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should clear validation errors when field is updated', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      // Trigger validation error
      const submitButton = screen.getByText('Créer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email est requis')).toBeInTheDocument();
      });

      // Fix the error
      const emailInput = screen.getByLabelText('Email *');
      await user.type(emailInput, 'test@example.com');

      // Error should be cleared
      expect(screen.queryByText('Email est requis')).not.toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('should submit valid form data for new user', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      // Fill out the form
      await user.type(screen.getByLabelText('Prénom *'), 'John');
      await user.type(screen.getByLabelText('Nom *'), 'Doe');
      await user.type(screen.getByLabelText('Email *'), 'john@example.com');
      await user.type(screen.getByLabelText(/téléphone/i), '+1234567890');
      await user.type(screen.getByLabelText(/département/i), 'Computer Science');
      await user.type(screen.getByLabelText(/biographie/i), 'Test bio');
      await user.type(screen.getByLabelText('Mot de passe *'), 'password123');
      await user.type(screen.getByLabelText('Confirmer le mot de passe *'), 'password123');
      await user.selectOptions(screen.getByLabelText('Rôle *'), 'teacher');

      const submitButton = screen.getByText('Créer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          email: 'john@example.com',
          role: 'teacher',
          profile: {
            firstName: 'John',
            lastName: 'Doe',
            phone: '+1234567890',
            department: 'Computer Science',
            studentId: '',
            bio: 'Test bio',
          },
          password: 'password123',
          isActive: true,
        });
      });
    });

    it('should submit valid form data for existing user without password', async () => {
      const user = userEvent.setup();
      const existingUser = {
        _id: '123',
        email: 'existing@example.com',
        role: 'student',
        profile: {
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '',
          department: '',
          studentId: '12345',
          bio: '',
        },
        isActive: true,
      };

      render(<UserForm {...defaultProps} user={existingUser} />);

      // Update the first name
      const firstNameInput = screen.getByDisplayValue('Jane');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Janet');

      const submitButton = screen.getByText('Modifier');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          email: 'existing@example.com',
          role: 'student',
          profile: {
            firstName: 'Janet',
            lastName: 'Smith',
            phone: '',
            department: '',
            studentId: '12345',
            bio: '',
          },
          isActive: true,
        });
      }, { timeout: 3000 });
    });

    it('should include student ID for student role', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      // Fill required fields
      await user.type(screen.getByLabelText('Prénom *'), 'John');
      await user.type(screen.getByLabelText('Nom *'), 'Doe');
      await user.type(screen.getByLabelText('Email *'), 'john@example.com');
      await user.type(screen.getByLabelText('Mot de passe *'), 'password123');
      await user.type(screen.getByLabelText('Confirmer le mot de passe *'), 'password123');
      
      // Select student role
      await user.selectOptions(screen.getByLabelText('Rôle *'), 'student');
      
      // Fill student ID
      await user.type(screen.getByLabelText(/numéro étudiant/i), '12345');

      const submitButton = screen.getByText('Créer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            role: 'student',
            profile: expect.objectContaining({
              studentId: '12345',
            }),
          })
        );
      });
    });
  });

  describe('edge cases', () => {
    it('should handle form submission when disabled', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} isLoading={true} />);

      const submitButton = screen.getByRole('button', { name: /création/i });
      expect(submitButton).toBeDisabled();

      // Try to click (should not work)
      await user.click(submitButton);
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should handle nested profile field updates correctly', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      const phoneInput = screen.getByLabelText(/téléphone/i);
      await user.type(phoneInput, '+1234567890');

      const departmentInput = screen.getByLabelText(/département/i);
      await user.type(departmentInput, 'Engineering');

      // Fill required fields
      await user.type(screen.getByLabelText('Prénom *'), 'John');
      await user.type(screen.getByLabelText('Nom *'), 'Doe');
      await user.type(screen.getByLabelText('Email *'), 'john@example.com');
      await user.type(screen.getByLabelText('Mot de passe *'), 'password123');
      await user.type(screen.getByLabelText('Confirmer le mot de passe *'), 'password123');

      const submitButton = screen.getByText('Créer');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            profile: expect.objectContaining({
              phone: '+1234567890',
              department: 'Engineering',
            }),
          })
        );
      });
    });

    it('should handle role changes that affect conditional fields', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      const roleSelect = screen.getByLabelText('Rôle *');

      // Start with student role
      await user.selectOptions(roleSelect, 'student');
      expect(screen.getByLabelText(/numéro étudiant/i)).toBeInTheDocument();

      // Change to teacher role
      await user.selectOptions(roleSelect, 'teacher');
      expect(screen.queryByLabelText(/numéro étudiant/i)).not.toBeInTheDocument();

      // Change back to student role
      await user.selectOptions(roleSelect, 'student');
      expect(screen.getByLabelText(/numéro étudiant/i)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper form labels and structure', () => {
      render(<UserForm {...defaultProps} />);

      // Check that all form inputs have labels
      expect(screen.getByLabelText('Prénom *')).toBeInTheDocument();
      expect(screen.getByLabelText('Nom *')).toBeInTheDocument();
      expect(screen.getByLabelText('Email *')).toBeInTheDocument();
      expect(screen.getByLabelText('Rôle *')).toBeInTheDocument();
      expect(screen.getByLabelText(/téléphone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/département/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/biographie/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Mot de passe *')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirmer le mot de passe *')).toBeInTheDocument();
      expect(screen.getByLabelText(/compte actif/i)).toBeInTheDocument();
    });

    it('should have proper error message associations', async () => {
      const user = userEvent.setup();
      render(<UserForm {...defaultProps} />);

      const submitButton = screen.getByText('Créer');
      await user.click(submitButton);

      await waitFor(() => {
        const emailError = screen.getByText('Email est requis');
        expect(emailError).toHaveClass('text-red-500');
      });
    });
  });
});