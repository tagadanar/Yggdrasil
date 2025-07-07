'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
  } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const success = await login(data.email, data.password);
      if (success) {
        // Check if there's a redirect URL stored from a protected route
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        if (redirectUrl) {
          sessionStorage.removeItem('redirectAfterLogin');
          router.push(redirectUrl);
        } else {
          router.push('/dashboard');
        }
      }
    } catch (error: any) {
      setError('root', {
        type: 'manual',
        message: error.message || 'Erreur de connexion',
      });
    }
  };

  const setDemoCredentials = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-600">
            <LogIn className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Connexion à 101 School
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ou{' '}
            <Link
              href="/register"
              className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
            >
              créez un nouveau compte
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="form-label">
                Adresse email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('email', {
                    required: 'L\'adresse email est requise',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Adresse email invalide',
                    },
                  })}
                  type="email"
                  autoComplete="email"
                  className={`form-input pl-10 ${
                    errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                  placeholder="votre@email.com"
                />
              </div>
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="form-label">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  {...register('password', {
                    required: 'Le mot de passe est requis',
                    minLength: {
                      value: 8,
                      message: 'Le mot de passe doit contenir au moins 8 caractères',
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`form-input pl-10 pr-10 ${
                    errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                  placeholder="Votre mot de passe"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="form-error">{errors.password.message}</p>
              )}
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                {...register('rememberMe')}
                id="rememberMe"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                Se souvenir de moi
              </label>
            </div>

            <div className="text-sm">
              <Link
                href="/forgot-password"
                className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
              >
                Mot de passe oublié ?
              </Link>
            </div>
          </div>

          {/* Error Message */}
          {(error || errors.root) && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">
                {error || errors.root?.message}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting || isLoading ? (
                <>
                  <div className="loading-spinner mr-2" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Se connecter
                </>
              )}
            </button>
          </div>
        </form>

        {/* Demo Accounts */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Comptes de démonstration</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDemoCredentials('admin@yggdrasil.edu', 'Admin123!')}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('staff@yggdrasil.edu', 'Admin123!')}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Staff
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('teacher@yggdrasil.edu', 'Admin123!')}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Enseignant
            </button>
            <button
              type="button"
              onClick={() => setDemoCredentials('student@yggdrasil.edu', 'Admin123!')}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              Étudiant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}