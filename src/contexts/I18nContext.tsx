import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTranslation as useReactI18next } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type LanguageConfig, type TranslationFunction, type LanguageChangeFunction } from '../i18n/types';
import { useContextPreservation } from '../hooks/useContextPreservation';
import { useDocumentMetadata } from '../hooks/useDocumentMetadata';
import { i18nErrorHandler } from '../i18n/errorHandler';

// Context interface
interface I18nContextType {
  language: string;
  changeLanguage: LanguageChangeFunction;
  t: TranslationFunction;
  isLoading: boolean;
  error: string | null;
  supportedLanguages: LanguageConfig[];
  currentLanguageConfig: LanguageConfig | null;
  recoverFromError: () => Promise<void>;
}

// Provider props interface
interface I18nProviderProps {
  children: ReactNode;
}

// Create context with default values
const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Custom hook to use the I18n context
export const useI18nContext = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18nContext must be used within an I18nProvider');
  }
  return context;
};

// I18n Provider component
export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const { t, i18n: i18nInstance } = useReactI18next();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>(i18nInstance.language || 'hu');

  // Context preservation for seamless language switching
  const { preserveContext, restoreContext } = useContextPreservation();

  // Document metadata management
  const { updateMetadata, getPageMetadata } = useDocumentMetadata();

  // Get current language configuration
  const currentLanguageConfig = SUPPORTED_LANGUAGES.find(lang => lang.code === language) || null;

  // Error recovery function
  const recoverFromError = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Clear error handler log
      i18nErrorHandler.clearErrorLog();

      // Try to reinitialize i18n
      if (!i18nInstance.isInitialized) {
        await i18nInstance.init();
      }

      // Reload current language resources
      await i18nInstance.reloadResources([language]);
      
      // Verify language is working
      const testTranslation = i18nInstance.t('common:appTitle', { defaultValue: 'Test' });
      if (testTranslation === 'Test') {
        // If common namespace is not working, try to fallback to English
        if (language !== 'en') {
          console.warn('Current language resources not working, falling back to English');
          await i18nInstance.changeLanguage('en');
          setLanguage('en');
          localStorage.setItem('i18nextLng', 'en');
        }
      }

      setIsLoading(false);
      console.log('Successfully recovered from i18n error');
    } catch (recoveryErr) {
      console.error('Failed to recover from i18n error:', recoveryErr);
      setError(t('system:i18n.initializationFailed', { defaultValue: 'Failed to initialize internationalization' }));
      setIsLoading(false);
    }
  };

  // Initialize i18n and handle loading states
  useEffect(() => {
    const initializeI18n = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize error handler
        i18nErrorHandler.clearErrorLog();

        // Wait for i18n to be initialized
        if (!i18nInstance.isInitialized) {
          await i18nInstance.init();
        }

        // Enhanced language persistence with edge case handling
        const loadSavedLanguage = (): string => {
          try {
            // Try to get saved language from localStorage
            const savedLanguage = localStorage.getItem('i18nextLng');

            // Validate saved language
            if (savedLanguage && typeof savedLanguage === 'string') {
              const trimmedLanguage = savedLanguage.trim().toLowerCase();

              // Check if it's a supported language
              if (SUPPORTED_LANGUAGES.some(lang => lang.code === trimmedLanguage)) {
                return trimmedLanguage;
              }

              // Handle partial matches (e.g., 'hu-HU' -> 'hu')
              const languageCode = trimmedLanguage.split('-')[0];
              if (SUPPORTED_LANGUAGES.some(lang => lang.code === languageCode)) {
                return languageCode;
              }
            }

            // Check browser language as fallback
            const browserLanguage = navigator.language || navigator.languages?.[0];
            if (browserLanguage) {
              const browserLangCode = browserLanguage.split('-')[0].toLowerCase();
              if (SUPPORTED_LANGUAGES.some(lang => lang.code === browserLangCode)) {
                return browserLangCode;
              }
            }

            // Default to Hungarian
            return 'hu';
          } catch (err) {
            console.warn('Error loading saved language preference:', err);
            return 'hu';
          }
        };

        const targetLanguage = loadSavedLanguage();

        // Change to target language
        await i18nInstance.changeLanguage(targetLanguage);
        setLanguage(targetLanguage);

        // Ensure language is persisted correctly
        try {
          localStorage.setItem('i18nextLng', targetLanguage);
        } catch (err) {
          console.warn('Could not save language preference to localStorage:', err);
        }

        // Update document metadata after successful initialization
        updateDocumentMetadata(targetLanguage);

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize i18n:', err);
        setError(t('system:i18n.initializationFailed', { defaultValue: 'Failed to initialize internationalization' }));
        setIsLoading(false);

        // Fallback to Hungarian even if initialization fails
        setLanguage('hu');
        try {
          localStorage.setItem('i18nextLng', 'hu');
          // Try to update metadata even with fallback
          updateDocumentMetadata('hu');
        } catch (storageErr) {
          console.warn('Could not save fallback language to localStorage:', storageErr);
        }
      }
    };

    initializeI18n();
  }, [i18nInstance]);

  // Update document metadata when language changes
  const updateDocumentMetadata = (lng: string) => {
    try {
      // Only update metadata if i18n is ready and has resources
      if (!i18nInstance.isInitialized || !i18nInstance.hasResourceBundle(lng, 'common')) {
        console.warn(`Cannot update metadata: i18n not ready for language ${lng}`);
        return;
      }

      // Get base metadata from translations with safe fallbacks
      const baseTitle = i18nInstance.t('common:appTitle', {
        lng,
        defaultValue: 'Household Management',
        fallbackLng: 'en'
      });
      const baseDescription = i18nInstance.t('common:appDescription', {
        lng,
        defaultValue: 'Household management application for tracking plants, projects and tasks',
        fallbackLng: 'en'
      });
      const baseKeywords = i18nInstance.t('common:appKeywords', {
        lng,
        defaultValue: 'household, management, plants, projects, tasks, home',
        fallbackLng: 'en'
      });

      // Get language configuration
      const langConfig = SUPPORTED_LANGUAGES.find(lang => lang.code === lng);
      const direction: 'ltr' | 'rtl' = langConfig?.rtl ? 'rtl' : 'ltr';

      // Create base metadata configuration
      const baseMeta = {
        title: baseTitle,
        description: baseDescription,
        keywords: baseKeywords,
        language: lng,
        direction,
        ogLocale: lng === 'hu' ? 'hu_HU' : 'en_US',
      };

      // Get page-specific metadata
      const pageMetadata = getPageMetadata(baseMeta, t);

      // Update document metadata
      updateMetadata(pageMetadata);

      console.log(`Document metadata updated for language: ${lng}`);
    } catch (err) {
      console.warn('Error updating document metadata:', err);

      // Fallback: at least update the language attribute
      try {
        document.documentElement.lang = lng;
        document.documentElement.dir = 'ltr';
      } catch (fallbackErr) {
        console.error('Failed to update basic language attributes:', fallbackErr);
      }
    }
  };

  // Listen for language changes from i18next
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setLanguage(lng);

      // Update document metadata
      updateDocumentMetadata(lng);
    };

    i18nInstance.on('languageChanged', handleLanguageChange);

    return () => {
      i18nInstance.off('languageChanged', handleLanguageChange);
    };
  }, [i18nInstance, t, updateMetadata, getPageMetadata]);

  // Enhanced language change function with context preservation
  const changeLanguage: LanguageChangeFunction = async (newLanguage: string) => {
    const previousLanguage = language;

    try {
      setError(null);

      // Validate and normalize language code
      const normalizedLanguage = newLanguage.trim().toLowerCase();

      // Check if language is supported
      if (!SUPPORTED_LANGUAGES.some(lang => lang.code === normalizedLanguage)) {
        throw new Error(t('system:i18n.unsupportedLanguage', { 
          language: normalizedLanguage, 
          defaultValue: `Unsupported language: ${normalizedLanguage}` 
        }));
      }

      // Don't change if it's already the current language
      if (normalizedLanguage === language) {
        return;
      }

      // Preserve current context before language change
      preserveContext();

      // Change language in i18next
      await i18nInstance.changeLanguage(normalizedLanguage);

      // Update local state
      setLanguage(normalizedLanguage);

      // Persist to localStorage with error handling
      try {
        localStorage.setItem('i18nextLng', normalizedLanguage);
      } catch (storageErr) {
        console.warn('Could not save language preference to localStorage:', storageErr);
        // Continue execution even if localStorage fails
      }

      // Document metadata will be updated automatically by the languageChanged event listener

      // Restore context after a short delay to allow re-rendering
      setTimeout(() => {
        restoreContext();
      }, 100);

      console.log(`Language changed from ${previousLanguage} to: ${normalizedLanguage}`);
    } catch (err) {
      console.error('Failed to change language:', err);
      setError(t('system:i18n.languageChangeFailed', { 
        language: newLanguage, 
        defaultValue: `Failed to change language to ${newLanguage}` 
      }));

      // Revert to previous language on error
      try {
        await i18nInstance.changeLanguage(previousLanguage);
        setLanguage(previousLanguage);
        // Document metadata will be updated automatically by the languageChanged event listener

        // Try to restore previous language in localStorage
        try {
          localStorage.setItem('i18nextLng', previousLanguage);
        } catch (storageErr) {
          console.warn('Could not restore language preference in localStorage:', storageErr);
        }

        // Restore context even after error
        setTimeout(() => {
          restoreContext();
        }, 100);
      } catch (revertErr) {
        console.error('Failed to revert to previous language:', revertErr);

        // Last resort: fallback to Hungarian
        try {
          await i18nInstance.changeLanguage('hu');
          setLanguage('hu');
          localStorage.setItem('i18nextLng', 'hu');
          // Document metadata will be updated automatically by the languageChanged event listener

          // Still try to restore context
          setTimeout(() => {
            restoreContext();
          }, 100);
        } catch (fallbackErr) {
          console.error('Failed to fallback to Hungarian:', fallbackErr);
        }
      }
    }
  };

  // Enhanced translation function with error handling and better fallback mechanisms
  const translationFunction: TranslationFunction = (key: string, options = {}) => {
    try {
      // Check if i18n is ready before attempting translation
      if (!i18nInstance.isInitialized) {
        console.warn(`Translation attempted before i18n initialization: ${key}`);
        // Log to error handler for tracking
        i18nErrorHandler.logError(new Error(`Translation attempted before initialization: ${key}`), {
          key,
          language,
          initialized: false
        });
        return options.defaultValue || key;
      }

      // Check if the current language has the required namespace
      const namespace = key.includes(':') ? key.split(':')[0] : 'common';
      if (!i18nInstance.hasResourceBundle(language, namespace)) {
        console.warn(`Missing resource bundle for ${language}:${namespace}`);
        
        // Try fallback language (English) if available
        if (language !== 'en' && i18nInstance.hasResourceBundle('en', namespace)) {
          const fallbackResult = i18nInstance.t(key, { ...options, lng: 'en' });
          if (fallbackResult && fallbackResult !== key) {
            console.info(`Using English fallback for key: ${key}`);
            return typeof fallbackResult === 'string' ? fallbackResult : String(fallbackResult);
          }
        }
        
        // Log missing resource bundle
        i18nErrorHandler.logError(new Error(`Missing resource bundle: ${language}:${namespace}`), {
          key,
          language,
          namespace,
          initialized: i18nInstance.isInitialized
        });
        
        return options.defaultValue || (process.env.NODE_ENV === 'development' ? `[MISSING: ${key}]` : key);
      }

      const result = t(key, options);

      // Check if translation was successful
      if (result === key || !result) {
        // Translation key not found, try fallback strategies
        console.warn(`Translation key not found: ${key}`);
        
        // Log missing translation key
        i18nErrorHandler.logError(new Error(`Translation key not found: ${key}`), {
          key,
          language,
          namespace,
          initialized: i18nInstance.isInitialized
        });

        // Try fallback language (English) if current language is not English
        if (language !== 'en') {
          try {
            const fallbackResult = i18nInstance.t(key, { ...options, lng: 'en' });
            if (fallbackResult && fallbackResult !== key) {
              console.info(`Using English fallback for missing key: ${key}`);
              return typeof fallbackResult === 'string' ? fallbackResult : String(fallbackResult);
            }
          } catch (fallbackErr) {
            console.warn(`Fallback translation also failed for key: ${key}`, fallbackErr);
          }
        }

        // Return default value or formatted key for development
        return options.defaultValue || (process.env.NODE_ENV === 'development' ? `[MISSING: ${key}]` : '');
      }

      // Ensure we always return a string
      return typeof result === 'string' ? result : String(result);
    } catch (err) {
      console.error(`Translation error for key "${key}":`, err);
      
      // Log translation error
      i18nErrorHandler.logError(err as Error, {
        key,
        language,
        initialized: i18nInstance.isInitialized,
        errorType: 'translation'
      });

      // Enhanced fallback strategy for errors
      if (options.defaultValue) {
        return options.defaultValue;
      }

      // Try to extract a meaningful fallback from the key
      const keyParts = key.split(':');
      const lastPart = keyParts[keyParts.length - 1];
      const humanReadable = lastPart
        .split('.')
        .pop()
        ?.replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();

      // Return human-readable version in production, error indicator in development
      if (process.env.NODE_ENV === 'development') {
        return `[ERROR: ${key}]`;
      }

      return humanReadable || '';
    }
  };

  // Context value
  const contextValue: I18nContextType = {
    language,
    changeLanguage,
    t: translationFunction,
    isLoading,
    error,
    supportedLanguages: SUPPORTED_LANGUAGES,
    currentLanguageConfig,
    recoverFromError,
  };

  // Show loading state while initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">
            {i18nInstance.isInitialized ? t('system:i18n.initializing', { defaultValue: 'Initializing language system...' }) : t('system:i18n.initializing', { defaultValue: 'Initializing language system...' })}
          </p>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (error && !language) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p className="mb-4">{t('system:i18n.languageLoadFailed', { defaultValue: 'Failed to load language settings' })}</p>
          <div className="space-y-2">
            <button
              onClick={recoverFromError}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
            >
              {t('system:i18n.retryLanguageLoad', { defaultValue: 'Retry Loading Languages' })}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              {t('system:retry', { defaultValue: 'Reload Page' })}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-gray-600">
              {t('system:i18n.fallbackToDefault', { defaultValue: 'Falling back to default language' })}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};