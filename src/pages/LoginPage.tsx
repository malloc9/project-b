import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { PasswordResetForm } from '../components/auth/PasswordResetForm';
import { useTranslation } from '../hooks/useTranslation';

type ViewMode = 'login' | 'reset-password';

export function LoginPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Get the intended destination from location state, default to dashboard
  const from = location.state?.from?.pathname || '/';

  const handleLoginSuccess = () => {
    navigate(from, { replace: true });
  };

  const handleForgotPassword = () => {
    setViewMode('reset-password');
  };

  const handleResetCancel = () => {
    setViewMode('login');
  };

  const handleResetSuccess = () => {
    // Stay on reset form to show success message
    // User can click "Back to sign in" to return to login
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('auth:householdManagementTitle')}
          </h1>
          <p className="text-gray-600">
            {t('auth:managePlantsProjectsTasks')}
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          {viewMode === 'login' ? (
            <LoginForm
              onSuccess={handleLoginSuccess}
              onForgotPassword={handleForgotPassword}
            />
          ) : (
            <PasswordResetForm
              onSuccess={handleResetSuccess}
              onCancel={handleResetCancel}
            />
          )}
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>
            {t('auth:secureAuthenticationPoweredBy')}
          </p>
        </div>
      </div>
    </div>
  );
}