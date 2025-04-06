// src/components/auth/__tests__/LoginForm.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '../LoginForm';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('LoginForm', () => {
  test('renders the login form correctly', () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );
    
    // Check for form elements
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });
  
  test('validates form inputs', async () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );
    
    // Try to submit without filling fields
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });
  
  test('submits form with valid inputs', async () => {
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    // Check that form submission started
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /logging in/i })).toBeInTheDocument();
    });
  });
  
  test('displays dev mode bypass button', () => {
    // Mock environment to development
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    );
    
    // Check for dev bypass button
    expect(screen.getByRole('button', { name: /dev login/i })).toBeInTheDocument();
    
    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });
});