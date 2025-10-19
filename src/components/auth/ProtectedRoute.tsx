import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Protected route wrapper that requires authentication
 */
export function ProtectedRoute({ children, redirectTo = '/login' }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { t } = useTranslation(['loading']);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-2" role="status" aria-hidden="true"></div>
          <p className="text-gray-600">{t('loading:authenticating', { defaultValue: 'Authenticating...' })}</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Render children if authenticated
  return <>{children}</>;
}

/**
 * Public route wrapper that redirects authenticated users
 */
export function PublicRoute({ children, redirectTo = '/' }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { t } = useTranslation(['loading']);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-2" role="status" aria-hidden="true"></div>
          <p className="text-gray-600">{t('loading:authenticating', { defaultValue: 'Authenticating...' })}</p>
        </div>
      </div>
    );
  }

  // Redirect to dashboard if already authenticated
  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Render children if not authenticated
  return <>{children}</>;
}