import React from 'react';
import type { TranslationError, TranslationErrorHandler } from './types';
import i18n from './index';

/**
 * Comprehensive error handler for i18n operations
 */
export class I18nErrorHandler implements TranslationErrorHandler {
  private static instance: I18nErrorHandler;
  private errorLog: TranslationError[] = [];
  private maxLogSize = 100;

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  public static getInstance(): I18nErrorHandler {
    if (!I18nErrorHandler.instance) {
      I18nErrorHandler.instance = new I18nErrorHandler();
    }
    return I18nErrorHandler.instance;
  }

  /**
   * Handle translation errors
   */
  public onError = (error: TranslationError): void => {
    // Add to error log
    this.addToErrorLog(error);

    // Log to console based on environment
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[I18n Error] ${error.type}: ${error.message}`, {
        key: error.key,
        namespace: error.namespace,
        fallbackUsed: error.fallbackUsed,
      });
    } else {
      // In production, only log critical errors
      if (error.type === 'LOADING_ERROR' || error.type === 'NAMESPACE_ERROR') {
        console.error(`[I18n Critical] ${error.type}: ${error.message}`);
      }
    }

    // Trigger custom error reporting if configured
    this.reportError(error);
  };

  /**
   * Handle missing translation keys
   */
  public onMissingKey = (key: string, namespace?: string): string => {
    const error: TranslationError = {
      type: 'MISSING_KEY',
      key,
      namespace,
      message: `Missing translation key: ${key}${namespace ? ` in namespace: ${namespace}` : ''}`,
      fallbackUsed: true,
    };

    this.onError(error);

    // Return appropriate fallback
    return this.getFallbackForMissingKey(key, namespace);
  };

  /**
   * Handle translation loading errors
   */
  public onLoadingError = (namespace: string, error: Error): void => {
    const translationError: TranslationError = {
      type: 'LOADING_ERROR',
      key: '',
      namespace,
      message: `Failed to load translations for namespace: ${namespace}. ${error.message}`,
      fallbackUsed: false,
    };

    this.onError(translationError);

    // Attempt to load fallback language
    this.loadFallbackNamespace(namespace);
  };

  /**
   * Get fallback text for missing keys
   */
  private getFallbackForMissingKey(key: string, namespace?: string): string {
    // Try to get English translation as fallback
    if (i18n.language !== 'en') {
      try {
        const fallbackKey = namespace ? `${namespace}:${key}` : key;
        const englishTranslation = i18n.getFixedT('en')(fallbackKey);
        
        if (englishTranslation && englishTranslation !== fallbackKey) {
          return englishTranslation;
        }
      } catch (err) {
        console.warn('Failed to get English fallback for key:', key, err);
      }
    }

    // Try common error messages
    const commonFallbacks: Record<string, string> = {
      'error': i18n.language === 'hu' ? 'Hiba történt' : 'An error occurred',
      'loading': i18n.language === 'hu' ? 'Betöltés...' : 'Loading...',
      'save': i18n.language === 'hu' ? 'Mentés' : 'Save',
      'cancel': i18n.language === 'hu' ? 'Mégse' : 'Cancel',
      'ok': 'OK',
      'yes': i18n.language === 'hu' ? 'Igen' : 'Yes',
      'no': i18n.language === 'hu' ? 'Nem' : 'No',
    };

    const lastKeyPart = key.split('.').pop() || key;
    if (commonFallbacks[lastKeyPart]) {
      return commonFallbacks[lastKeyPart];
    }

    // Development vs production fallback
    if (process.env.NODE_ENV === 'development') {
      return `[MISSING: ${namespace ? `${namespace}:` : ''}${key}]`;
    } else {
      // In production, return a user-friendly message or empty string
      return '';
    }
  }

  /**
   * Attempt to load fallback namespace
   */
  private async loadFallbackNamespace(namespace: string): Promise<void> {
    try {
      // Try to load English version of the namespace
      await i18n.loadNamespaces(namespace);
      
      // If that fails, try to load from common namespace
      if (!i18n.hasResourceBundle('en', namespace)) {
        console.warn(`Fallback: Using common namespace for missing ${namespace}`);
      }
    } catch (err) {
      console.error(`Failed to load fallback for namespace ${namespace}:`, err);
    }
  }

  /**
   * Add error to internal log
   */
  private addToErrorLog(error: TranslationError): void {
    this.errorLog.push({
      ...error,
      timestamp: new Date().toISOString(),
    } as TranslationError & { timestamp: string });

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }
  }

  /**
   * Setup global error handlers for i18n
   */
  private setupGlobalErrorHandlers(): void {
    // Handle i18n initialization errors
    i18n.on('failedLoading', (lng: string, ns: string, msg: string) => {
      this.onLoadingError(ns, new Error(`Failed loading ${lng}/${ns}: ${msg}`));
    });

    // Handle missing keys
    i18n.on('missingKey', (_lng: string[], ns: string, key: string, _res: string) => {
      this.onMissingKey(key, ns);
    });

    // Handle language change errors
    i18n.on('languageChanged', (lng: string) => {
      // Validate that the language change was successful
      if (!i18n.hasResourceBundle(lng, 'common')) {
        const error: TranslationError = {
          type: 'LOADING_ERROR',
          key: '',
          namespace: 'common',
          message: `Language changed to ${lng} but common resources are not available`,
          fallbackUsed: true,
        };
        this.onError(error);
      }
    });
  }

  /**
   * Report error to external service (if configured)
   */
  private reportError(error: TranslationError): void {
    // This could be extended to report to external error tracking services
    // like Sentry, LogRocket, etc.
    
    // For now, just store in sessionStorage for debugging
    try {
      const existingErrors = JSON.parse(sessionStorage.getItem('i18n_errors') || '[]');
      existingErrors.push({
        ...error,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
      
      // Keep only last 50 errors
      const recentErrors = existingErrors.slice(-50);
      sessionStorage.setItem('i18n_errors', JSON.stringify(recentErrors));
    } catch (err) {
      console.warn('Failed to store error in sessionStorage:', err);
    }
  }

  /**
   * Get error statistics for debugging
   */
  public getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: TranslationError[];
  } {
    const errorsByType = this.errorLog.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors: this.errorLog.length,
      errorsByType,
      recentErrors: this.errorLog.slice(-10),
    };
  }

  /**
   * Clear error log
   */
  public clearErrorLog(): void {
    this.errorLog = [];
    try {
      sessionStorage.removeItem('i18n_errors');
    } catch (err) {
      console.warn('Failed to clear error log from sessionStorage:', err);
    }
  }

  /**
   * Safe translation function with comprehensive error handling
   */
  public safeTranslate = (
    key: string,
    options: {
      ns?: string;
      defaultValue?: string;
      count?: number;
      [key: string]: any;
    } = {}
  ): string => {
    try {
      // Validate inputs
      if (!key || typeof key !== 'string') {
        throw new Error(`Invalid translation key: ${key}`);
      }

      // Attempt translation
      const fullKey = options.ns ? `${options.ns}:${key}` : key;
      const result = i18n.t(fullKey, options);

      // Check if translation was successful
      if (result === fullKey || result === key) {
        // Translation not found, use fallback
        return this.onMissingKey(key, options.ns);
      }

      // Ensure we return a string
      return typeof result === 'string' ? result : String(result);
    } catch (err) {
      const error: TranslationError = {
        type: 'INTERPOLATION_ERROR',
        key,
        namespace: options.ns,
        message: `Translation error for key "${key}": ${err instanceof Error ? err.message : String(err)}`,
        fallbackUsed: true,
      };

      this.onError(error);

      // Return fallback
      return options.defaultValue || this.getFallbackForMissingKey(key, options.ns);
    }
  };
}

// Export singleton instance
export const i18nErrorHandler = I18nErrorHandler.getInstance();

// Export utility functions
export const safeTranslate = i18nErrorHandler.safeTranslate;

/**
 * Higher-order component for error boundary around translation components
 */
export const withTranslationErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> => {
  return (props: P) => {
    try {
      return React.createElement(Component, props);
    } catch (err) {
      console.error('Translation component error:', err);
      
      // Return a fallback UI
      return React.createElement('div', {
        className: 'text-red-500 text-sm'
      }, process.env.NODE_ENV === 'development' 
        ? `Translation Error: ${err instanceof Error ? err.message : String(err)}`
        : 'Content unavailable'
      );
    }
  };
};