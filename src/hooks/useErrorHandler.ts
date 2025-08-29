import { useCallback, useState } from 'react';
import { AppError, createAppError, ErrorCode, getErrorMessage } from '../types/errors';
import { ErrorLogger } from '../utils/errorLogger';

interface UseErrorHandlerReturn {
  error: AppError | null;
  isError: boolean;
  clearError: () => void;
  handleError: (error: Error | AppError | string, context?: string) => void;
  handleAsyncError: <T>(
    asyncFn: () => Promise<T>,
    context?: string
  ) => Promise<T | null>;
  retryWithErrorHandling: <T>(
    asyncFn: () => Promise<T>,
    maxRetries?: number,
    context?: string
  ) => Promise<T | null>;
}

/**
 * Hook for handling errors in components with automatic logging and user feedback
 */
export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [error, setError] = useState<AppError | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((
    errorInput: Error | AppError | string,
    context?: string
  ) => {
    let appError: AppError;

    if (typeof errorInput === 'string') {
      appError = createAppError(
        ErrorCode.UNKNOWN_ERROR,
        errorInput,
        { context }
      );
    } else if ('code' in errorInput && 'timestamp' in errorInput) {
      // Already an AppError
      appError = errorInput;
    } else {
      // JavaScript Error
      appError = createAppError(
        ErrorCode.UNKNOWN_ERROR,
        errorInput.message || 'An unexpected error occurred',
        {
          stack: errorInput.stack,
          name: errorInput.name,
          context
        }
      );
    }

    setError(appError);
    ErrorLogger.logError(appError);
  }, []);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      clearError();
      return await asyncFn();
    } catch (error) {
      handleError(error as Error, context);
      return null;
    }
  }, [handleError, clearError]);

  const retryWithErrorHandling = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    maxRetries: number = 3,
    context?: string
  ): Promise<T | null> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        clearError();
        return await asyncFn();
      } catch (error) {
        lastError = error as Error;
        
        // If this is the last attempt, handle the error
        if (attempt === maxRetries) {
          handleError(lastError, `${context} (failed after ${maxRetries} attempts)`);
          return null;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return null;
  }, [handleError, clearError]);

  return {
    error,
    isError: error !== null,
    clearError,
    handleError,
    handleAsyncError,
    retryWithErrorHandling
  };
};

/**
 * Hook for displaying error messages with automatic clearing
 */
export const useErrorMessage = (autoCleanMs: number = 5000) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showError = useCallback((error: AppError | Error | string) => {
    const message = typeof error === 'string' 
      ? error 
      : 'message' in error 
        ? error.message 
        : getErrorMessage(error as AppError);
    
    setErrorMessage(message);

    // Auto-clear after specified time
    if (autoCleanMs > 0) {
      setTimeout(() => {
        setErrorMessage(null);
      }, autoCleanMs);
    }
  }, [autoCleanMs]);

  const clearErrorMessage = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return {
    errorMessage,
    showError,
    clearErrorMessage,
    hasError: errorMessage !== null
  };
};