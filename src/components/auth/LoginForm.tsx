import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/authService';
import { useTranslation } from '../../hooks/useTranslation';

interface LoginFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
}

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export function LoginForm({ onSuccess, onForgotPassword }: LoginFormProps) {
  const { login } = useAuth();
  const { t, isLoading } = useTranslation();

  // Safe translation function that handles loading state
  const safeT = (key: string, fallback: string) => {
    if (isLoading) return fallback;
    return t(key, { defaultValue: fallback });
  };
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = safeT('auth:validation.emailRequired', 'Email is required');
    } else if (!AuthService.validateEmail(formData.email)) {
      newErrors.email = safeT('auth:validation.validEmailRequired', 'Please enter a valid email address');
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = safeT('auth:validation.passwordRequired', 'Password is required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear field-specific error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await login(formData.email, formData.password);
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : safeT('auth:validation.loginFailed', 'Login failed');
      setErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await AuthService.signup(formData.email, formData.password);
      await login(formData.email, formData.password);
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : safeT('auth:validation.signupFailed', 'Signup failed');
      setErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
            {safeT('auth:signIn', 'Sign In')}
          </h2>
        </div>

        {errors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {errors.general}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            {safeT('auth:emailAddress', 'Email Address')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder={safeT('auth:enterEmail', 'Enter your email')}
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            {safeT('auth:password', 'Password')}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={formData.password}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.password ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder={safeT('auth:enterPassword', 'Enter your password')}
            disabled={isSubmitting}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {safeT('auth:signingIn', 'Signing in...')}
              </div>
            ) : (
              safeT('auth:signIn', 'Sign In')
            )}
          </button>
        </div>

        {/* Development signup button */}
        {import.meta.env.DEV && (
          <div>
            <button
              type="button"
              onClick={handleSignup}
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? safeT('auth:creatingAccount', 'Creating Account...') : safeT('auth:createTestAccount', 'Create Test Account')}
            </button>
          </div>
        )}

        <div className="text-center">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
            disabled={isSubmitting}
          >
            {safeT('auth:forgotPassword', 'Forgot your password?')}
          </button>
        </div>
      </form>
    </div>
  );
}