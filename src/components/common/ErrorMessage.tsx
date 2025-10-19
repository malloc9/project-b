import { useTranslation } from 'react-i18next';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ message, onRetry, className = '' }: ErrorMessageProps) {
  const { t } = useTranslation(['errors', 'system']);
  return (
    <div className={`bg-red-50 border border-red-200 rounded-md p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">{t('errors:general.unknownError', { defaultValue: 'Error' })}</h3>
          <p className="mt-1 text-sm text-red-700">{message}</p>
          {onRetry && (
            <div className="mt-3">
              <button
                onClick={onRetry}
                className="text-sm font-medium text-red-800 hover:text-red-900 underline"
              >
                {t('system:retry', { defaultValue: 'Try again' })}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}