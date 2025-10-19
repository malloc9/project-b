import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Authentication layout that shows loading state during auth initialization
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  const { loading } = useAuth();
  const { t } = useTranslation(['loading', 'common']);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            {t('loading:authenticating', { defaultValue: 'Loading...' })}
          </h2>
          <p className="text-gray-600">
            {t('loading:initializing', { defaultValue: 'Initializing your household management app' })}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}