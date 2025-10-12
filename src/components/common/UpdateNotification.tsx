import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { useServiceWorker } from '../../hooks/useServiceWorker';
import type { UpdateError } from '../../utils/serviceWorkerManager';

interface UpdateNotificationProps {
  isVisible: boolean;
  onUpdate: () => Promise<void>;
  onDismiss?: () => void;
  className?: string;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  isVisible,
  onUpdate,
  onDismiss,
  className = ''
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [errorHistory, setErrorHistory] = useState<UpdateError[]>([]);

  const {
    retryUpdateWithBackoff,
    recoverFromFailedUpdate,
    validateServiceWorkerHealth,
    getUpdateErrorHistory,
    clearUpdateErrorHistory,
    isOnline
  } = useServiceWorker();

  // Load error history when component mounts or becomes visible
  useEffect(() => {
    if (isVisible) {
      const history = getUpdateErrorHistory();
      setErrorHistory(history);
    }
  }, [isVisible, getUpdateErrorHistory]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    setUpdateError(null);
    
    try {
      await onUpdate();
    } catch (error) {
      console.error('Update failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Update failed. Please try again.';
      setUpdateError(errorMessage);
      setRetryCount(prev => prev + 1);
      setIsUpdating(false);
      
      // Update error history
      const history = getUpdateErrorHistory();
      setErrorHistory(history);
    }
  };

  const handleRetryWithBackoff = async () => {
    setIsUpdating(true);
    setUpdateError(null);
    
    try {
      await retryUpdateWithBackoff();
    } catch (error) {
      console.error('Retry with backoff failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Retry failed. Please try recovery options.';
      setUpdateError(errorMessage);
      setRetryCount(prev => prev + 1);
      setIsUpdating(false);
      setShowAdvancedOptions(true);
      
      // Update error history
      const history = getUpdateErrorHistory();
      setErrorHistory(history);
    }
  };

  const handleRecovery = async () => {
    setIsUpdating(true);
    setUpdateError(null);
    
    try {
      const recovered = await recoverFromFailedUpdate();
      if (recovered) {
        setUpdateError(null);
        setRetryCount(0);
        setShowAdvancedOptions(false);
        // The recovery process will reload the page if successful
      } else {
        setUpdateError('Recovery failed. Please refresh the page manually.');
      }
    } catch (error) {
      console.error('Recovery failed:', error);
      setUpdateError('Recovery failed. Please refresh the page manually.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleHealthCheck = async () => {
    try {
      const isHealthy = await validateServiceWorkerHealth();
      if (isHealthy) {
        setUpdateError('Service worker is healthy. Try updating again.');
      } else {
        setUpdateError('Service worker health check failed. Try recovery.');
        setShowAdvancedOptions(true);
      }
    } catch (error) {
      setUpdateError('Health check failed. Try recovery.');
      setShowAdvancedOptions(true);
    }
  };

  const handleClearErrorHistory = () => {
    clearUpdateErrorHistory();
    setErrorHistory([]);
    setUpdateError(null);
    setRetryCount(0);
    setShowAdvancedOptions(false);
  };

  const handleDismiss = () => {
    if (!isUpdating && onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed top-4 left-4 right-4 mobile:left-2 mobile:right-2 z-50 ${className}`}>
      <div className="bg-blue-600 text-white rounded-lg shadow-lg border border-blue-700 max-w-md mx-auto">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg 
                  className="w-4 h-4 text-white" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-sm mobile:text-base">
                  App Update Available
                </h3>
                <p className="text-blue-100 text-xs mobile:text-sm">
                  A new version is ready to install
                </p>
              </div>
            </div>
            
            {/* Dismiss button */}
            {!isUpdating && onDismiss && (
              <button
                onClick={handleDismiss}
                className="text-blue-200 hover:text-white transition-colors p-1 -mt-1 -mr-1"
                aria-label="Dismiss notification"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Offline indicator */}
          {!isOnline && (
            <div className="mb-3 p-2 bg-yellow-500 bg-opacity-20 border border-yellow-400 rounded text-yellow-100 text-xs flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>You're offline. Update will retry when connection is restored.</span>
            </div>
          )}

          {/* Error message with retry count */}
          {updateError && (
            <div className="mb-3 p-2 bg-red-500 bg-opacity-20 border border-red-400 rounded text-red-100 text-xs">
              <div className="flex items-start justify-between">
                <span>{updateError}</span>
                {retryCount > 0 && (
                  <span className="text-red-200 text-xs ml-2">({retryCount} attempts)</span>
                )}
              </div>
            </div>
          )}

          {/* Error history summary */}
          {errorHistory.length > 0 && !showAdvancedOptions && (
            <div className="mb-3 p-2 bg-orange-500 bg-opacity-20 border border-orange-400 rounded text-orange-100 text-xs">
              <button
                onClick={() => setShowAdvancedOptions(true)}
                className="flex items-center space-x-1 hover:text-white transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{errorHistory.length} previous error(s) - Click for options</span>
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {/* Primary update button */}
            <div className="flex flex-col mobile:flex-row gap-2">
              <button
                onClick={retryCount > 0 ? handleRetryWithBackoff : handleUpdate}
                disabled={isUpdating || !isOnline}
                className="flex-1 bg-white text-blue-600 font-medium py-2 px-4 rounded-md hover:bg-blue-50 disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors text-sm mobile:text-base flex items-center justify-center space-x-2"
              >
                {isUpdating ? (
                  <>
                    <LoadingSpinner size="sm" className="text-blue-600" />
                    <span>Updating...</span>
                  </>
                ) : retryCount > 0 ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Retry with Smart Backoff</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Update Now</span>
                  </>
                )}
              </button>
              
              {!isUpdating && (
                <button
                  onClick={handleDismiss}
                  className="mobile:flex-shrink-0 bg-blue-500 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-400 transition-colors text-sm mobile:text-base mobile:hidden"
                >
                  Later
                </button>
              )}
            </div>

            {/* Advanced options */}
            {showAdvancedOptions && !isUpdating && (
              <div className="mt-2 pt-2 border-t border-blue-500">
                <div className="text-blue-100 text-xs mb-2">Advanced Recovery Options:</div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col mobile:flex-row gap-2">
                    <button
                      onClick={handleHealthCheck}
                      className="flex-1 bg-blue-500 text-white font-medium py-1.5 px-3 rounded text-xs hover:bg-blue-400 transition-colors flex items-center justify-center space-x-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Health Check</span>
                    </button>
                    <button
                      onClick={handleRecovery}
                      className="flex-1 bg-orange-500 text-white font-medium py-1.5 px-3 rounded text-xs hover:bg-orange-400 transition-colors flex items-center justify-center space-x-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Full Recovery</span>
                    </button>
                  </div>
                  <button
                    onClick={handleClearErrorHistory}
                    className="bg-gray-500 text-white font-medium py-1.5 px-3 rounded text-xs hover:bg-gray-400 transition-colors flex items-center justify-center space-x-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Clear Error History</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Progress indicator */}
          {isUpdating && (
            <div className="mt-3 pt-3 border-t border-blue-500">
              <div className="flex items-center space-x-2 text-blue-100 text-xs">
                <div className="flex-1 bg-blue-500 rounded-full h-1">
                  <div className="bg-white h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
                <span>Installing update...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};