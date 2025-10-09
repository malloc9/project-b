import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/authService';
import { useTranslation } from '../../hooks/useTranslation';

interface PasswordResetFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  email: string;
}

interface FormErrors {
  email?: string;
  general?: string;
}

export function PasswordResetForm({ onSuccess, onCancel }: PasswordResetFormProps) {
  const { resetPassword } = useAuth();
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FormData>({
    email: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = t('auth:validation.emailRequired');
    } else if (!AuthService.validateEmail(formData.email)) {
      newErrors.email = t('auth:validation.validEmailRequired');
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
      await resetPassword(formData.email);
      setIsSuccess(true);
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('auth:validation.passwordResetFailed');
      setErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="text-center space-y-4">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
            <h3 className="font-medium">{t('auth:passwordResetEmailSent')}</h3>
            <p className="text-sm mt-1">
              {t('auth:checkEmailForInstructions')}
            </p>
          </div>
          
          <button
            onClick={onCancel}
            className="text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
          >
            {t('auth:backToSignIn')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            {t('auth:resetPassword')}
          </h2>
          <p className="text-sm text-gray-600 text-center mb-6">
            {t('auth:resetPasswordDescription')}
          </p>
        </div>

        {errors.general && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {errors.general}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth:emailAddress')}
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
            placeholder={t('auth:enterEmail')}
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div className="space-y-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('auth:sending')}
              </div>
            ) : (
              t('auth:sendResetEmail')
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={isSubmitting}
          >
            {t('common:cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}