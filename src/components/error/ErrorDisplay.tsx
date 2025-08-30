import React, { useState } from 'react';
import type { AppError } from '../../types/errors';
import { getErrorMessage } from '../../types/errors';

interface ErrorDisplayProps {
  error: AppError;
  errorId: string | null;
  onRetry?: () => void;
  onReload?: () => void;
  showDetails?: boolean;
  className?: string;
}

/**
 * User-friendly error display component with recovery options
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  errorId,
  onRetry,
  onReload,
  showDetails = false,
  className = ''
}) => {
  const [showFullDetails, setShowFullDetails] = useState(false);
  const userMessage = getErrorMessage(error);

  const handleCopyError = () => {
    const errorDetails = {
      id: errorId,
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
      details: error.details
    };
    
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
  };

  const handleReportError = () => {
    // In a real app, this would send to an error reporting service
    console.log('Error reported:', { error, errorId });
    alert('Error report sent. Thank you for helping us improve the application.');
  };

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gray-50 px-4 ${className}`}>
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        {/* Error Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        {/* Error Title */}
        <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
          Something went wrong
        </h1>

        {/* User-friendly message */}
        <p className="text-gray-600 text-center mb-6">
          {userMessage}
        </p>

        {/* Action buttons */}
        <div className="space-y-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Try Again
            </button>
          )}
          
          {onReload && (
            <button
              onClick={onReload}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Reload Page
            </button>
          )}

          <button
            onClick={handleReportError}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
          >
            Report Issue
          </button>
        </div>

        {/* Error details for development */}
        {showDetails && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowFullDetails(!showFullDetails)}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              {showFullDetails ? 'Hide' : 'Show'} Error Details
            </button>
            
            {showFullDetails && (
              <div className="bg-gray-100 rounded p-3 text-xs font-mono">
                <div className="mb-2">
                  <strong>Error ID:</strong> {errorId}
                </div>
                <div className="mb-2">
                  <strong>Code:</strong> {error.code}
                </div>
                <div className="mb-2">
                  <strong>Message:</strong> {error.message}
                </div>
                <div className="mb-2">
                  <strong>Timestamp:</strong> {error.timestamp.toISOString()}
                </div>
                {error.details && (
                  <div>
                    <strong>Details:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">
                      {JSON.stringify(error.details, null, 2)}
                    </pre>
                  </div>
                )}
                <button
                  onClick={handleCopyError}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Copy Error Details
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error ID for support */}
        {errorId && (
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Error ID: <span className="font-mono">{errorId}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Please include this ID when reporting the issue
            </p>
          </div>
        )}
      </div>
    </div>
  );
};