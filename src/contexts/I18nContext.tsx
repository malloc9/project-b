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
        setError('Failed to initialize internationalization');
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
        throw new Error(`Unsupported language: ${normalizedLanguage}`);
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
      setError(`Failed to change language to ${newLanguage}`);

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

  // Enhanced translation function with error handling
  const translationFunction: TranslationFunction = (key: string, options = {}) => {
    try {
      // Check if i18n is ready before attempting translation
      if (!i18nInstance.isInitialized) {
        console.warn(`Translation attempted before i18n initialization: ${key}`);
        return options.defaultValue || key;
      }

      const result = t(key, options);

      // Check if translation was successful
      if (result === key || !result) {
        // Translation not found, return default or key
        return options.defaultValue || (process.env.NODE_ENV === 'development' ? `[${key}]` : '');
      }

      // Ensure we always return a string
      return typeof result === 'string' ? result : String(result);
    } catch (err) {
      console.warn(`Translation error for key "${key}":`, err);

      // Return the key itself as fallback in development
      if (process.env.NODE_ENV === 'development') {
        return `[ERROR: ${key}]`;
      }

      // Return default value or empty string in production
      return options.defaultValue || '';
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
  };

  // Show loading state while initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (error && !language) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p className="mb-2">Failed to load language settings</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
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