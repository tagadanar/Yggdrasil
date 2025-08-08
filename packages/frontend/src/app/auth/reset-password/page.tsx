'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Clear any previous errors
    setError('');
    
    try {
      // In a real app, this would call an API to send reset email
      // For now, just show success message after a brief delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      setSubmitted(true);
    } catch (err) {
      setError('Failed to send reset email');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <EnvelopeIcon className="w-16 h-16 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Check Your Email
            </h1>
            <p className="text-lg text-gray-600" data-testid="reset-success-message">
              Password reset link has been sent to {email}. Please check your email for further instructions.
            </p>
            <Button
              onClick={() => router.push('/auth/login')}
              variant="primary"
              className="mt-6"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <LockClosedIcon className="w-16 h-16 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reset Your Password
          </h1>
          <p className="text-lg text-gray-600">
            Enter your email address and we'll send you instructions
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          <form className="space-y-6" onSubmit={handleSubmit} data-testid="reset-password-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label flex items-center gap-2">
                <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="Enter your email"
                data-testid="reset-email-input"
              />
            </div>

            {error && (
              <div className="bg-error-50 border border-error-200 rounded-md p-3">
                <p className="text-error-700 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              data-testid="reset-submit-button"
              className="w-full flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Send Reset Link
            </button>

            <div className="text-center">
              <a 
                href="/auth/login"
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                Back to Login
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}