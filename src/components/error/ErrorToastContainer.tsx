import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AppError } from '../../types/errors';
import { ErrorToast } from './ErrorToast';

interface ToastItem {
  id: string;
  error: AppError;
  timestamp: Date;
}

interface ErrorToastContextType {
  showError: (error: AppError) => void;
  clearAllErrors: () => void;
  errorCount: number;
}

const ErrorToastContext = createContext<ErrorToastContextType | undefined>(undefined);

interface ErrorToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

/**
 * Provider component that manages error toast notifications
 */
export const ErrorToastProvider: React.FC<ErrorToastProviderProps> = ({
  children,
  maxToasts = 5,
  position = 'top-right'
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showError = useCallback((error: AppError) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastItem = {
      id,
      error,
      timestamp: new Date()
    };

    setToasts(prevToasts => {
      const updatedToasts = [...prevToasts, newToast];
      
      // Remove oldest toasts if we exceed the maximum
      if (updatedToasts.length > maxToasts) {
        return updatedToasts.slice(-maxToasts);
      }
      
      return updatedToasts;
    });
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  const clearAllErrors = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue: ErrorToastContextType = {
    showError,
    clearAllErrors,
    errorCount: toasts.length
  };

  return (
    <ErrorToastContext.Provider value={contextValue}>
      {children}
      
      {/* Render toasts */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className="pointer-events-auto"
            style={{
              // Stack toasts with slight offset
              transform: `translateY(${index * 70}px)`,
              zIndex: 50 + index
            }}
          >
            <ErrorToast
              error={toast.error}
              onClose={() => removeToast(toast.id)}
              position={position}
              autoClose={true}
              autoCloseDelay={5000}
            />
          </div>
        ))}
      </div>
    </ErrorToastContext.Provider>
  );
};

/**
 * Hook to access error toast functionality
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useErrorToast = (): ErrorToastContextType => {
  const context = useContext(ErrorToastContext);
  
  if (context === undefined) {
    throw new Error('useErrorToast must be used within an ErrorToastProvider');
  }
  
  return context;
};