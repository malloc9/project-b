import React, { Component, ErrorInfo, ReactNode } from 'react';
import type { AppError, ErrorCode } from '../../types/errors';
import { createAppError } from '../../types/errors';
import { ErrorLogger } from '../../utils/errorLogger';
import { ErrorDisplay } from './ErrorDisplay';

interface Props {
  children: ReactNode;
  fallback?: (error: AppError, retry: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: AppError | null;
  errorId: string | null;
}

/**
 * Global error boundary component that catches React component errors
 * and provides user-friendly error display with recovery options
 */
export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Convert React error to our AppError format
    const appError = createAppError(
      ErrorCode.UNKNOWN_ERROR,
      error.message || 'An unexpected error occurred in the application',
      {
        stack: error.stack,
        name: error.name,
        componentStack: 'React component error'
      }
    );

    return {
      hasError: true,
      error: appError,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { error: appError, errorId } = this.state;
    
    if (appError && errorId) {
      // Log the error with additional React-specific information
      const enhancedError = {
        ...appError,
        details: {
          ...appError.details,
          componentStack: errorInfo.componentStack,
          errorBoundary: 'ErrorBoundary'
        }
      };

      ErrorLogger.logError(enhancedError, errorId);
    }
  }

  handleRetry = () => {
    // Clear any existing timeout
    if (this.retryTimeoutId) {
      window.clearTimeout(this.retryTimeoutId);
    }

    // Reset error state after a brief delay to allow for cleanup
    this.retryTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorId: null
      });
    }, 100);
  };

  handleReload = () => {
    window.location.reload();
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      window.clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default error display
      return (
        <ErrorDisplay
          error={this.state.error}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      );
    }

    return this.props.children;
  }
}