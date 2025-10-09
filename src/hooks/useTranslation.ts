import { useI18nContext } from '../contexts/I18nContext';
import { safeTranslate } from '../i18n/errorHandler';
import { 
  type TranslationFunction, 
  type LanguageChangeFunction, 
  type LanguageConfig,
  type CommonKeys,
  type NavigationKeys,
  type AuthKeys,
  type DashboardKeys,
  type FormsKeys,
  type ErrorsKeys,
  type TranslationOptions
} from '../i18n/types';

// Enhanced translation hook return type
export interface UseTranslationReturn {
  // Core translation function
  t: TranslationFunction;
  
  // Language management
  language: string;
  changeLanguage: LanguageChangeFunction;
  
  // State information
  isLoading: boolean;
  error: string | null;
  
  // Language configuration
  supportedLanguages: LanguageConfig[];
  currentLanguageConfig: LanguageConfig | null;
  
  // Namespace-specific translation functions for better TypeScript support
  tCommon: (key: CommonKeys, options?: any) => string;
  tNavigation: (key: NavigationKeys, options?: any) => string;
  tAuth: (key: AuthKeys, options?: any) => string;
  tDashboard: (key: DashboardKeys, options?: any) => string;
  tForms: (key: FormsKeys, options?: any) => string;
  tErrors: (key: ErrorsKeys, options?: any) => string;
  
  // Utility functions
  formatDate: (date: Date | string, format?: string) => string;
  formatTime: (date: Date | string, format?: string) => string;
  isRTL: boolean;
}

/**
 * Custom hook that provides enhanced translation functionality
 * Wraps react-i18next useTranslation with additional features and TypeScript support
 */
export const useTranslation = (): UseTranslationReturn => {
  const {
    language,
    changeLanguage,
    isLoading,
    error,
    supportedLanguages,
    currentLanguageConfig,
  } = useI18nContext();

  // Enhanced translation function with error handling
  const safeT: TranslationFunction = (key: string, options = {}) => {
    return safeTranslate(key, options);
  };

  // Namespace-specific translation functions with TypeScript support and error handling
  const tCommon = (key: CommonKeys, options?: TranslationOptions): string => {
    return safeTranslate(key, { ...options, ns: 'common' });
  };

  const tNavigation = (key: NavigationKeys, options?: TranslationOptions): string => {
    return safeTranslate(key, { ...options, ns: 'navigation' });
  };

  const tAuth = (key: AuthKeys, options?: TranslationOptions): string => {
    return safeTranslate(key, { ...options, ns: 'auth' });
  };

  const tDashboard = (key: DashboardKeys, options?: TranslationOptions): string => {
    return safeTranslate(key, { ...options, ns: 'dashboard' });
  };

  const tForms = (key: FormsKeys, options?: TranslationOptions): string => {
    return safeTranslate(key, { ...options, ns: 'forms' });
  };

  const tErrors = (key: ErrorsKeys, options?: TranslationOptions): string => {
    return safeTranslate(key, { ...options, ns: 'errors' });
  };

  // Date formatting function based on current language with error handling
  const formatDate = (date: Date | string, format?: string): string => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      if (isNaN(dateObj.getTime())) {
        return safeTranslate('invalidDate', { ns: 'common', defaultValue: 'Invalid date' });
      }

      const locale = language === 'hu' ? 'hu-HU' : 'en-US';
      const dateFormat = format || currentLanguageConfig?.dateFormat;
      
      if (dateFormat) {
        // Use custom format if provided
        return new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(dateObj);
      }
      
      // Use locale-specific default formatting
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(dateObj);
    } catch (err) {
      console.warn('Date formatting error:', err);
      return safeTranslate('invalidDate', { ns: 'common', defaultValue: 'Invalid date' });
    }
  };

  // Time formatting function based on current language with error handling
  const formatTime = (date: Date | string, _format?: string): string => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      if (isNaN(dateObj.getTime())) {
        return safeTranslate('invalidTime', { ns: 'common', defaultValue: 'Invalid time' });
      }

      const locale = language === 'hu' ? 'hu-HU' : 'en-US';
      
      if (language === 'hu') {
        // Hungarian uses 24-hour format
        return new Intl.DateTimeFormat(locale, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(dateObj);
      } else {
        // English uses 12-hour format
        return new Intl.DateTimeFormat(locale, {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }).format(dateObj);
      }
    } catch (err) {
      console.warn('Time formatting error:', err);
      return safeTranslate('invalidTime', { ns: 'common', defaultValue: 'Invalid time' });
    }
  };

  // Check if current language is right-to-left
  const isRTL = currentLanguageConfig?.rtl || false;

  return {
    // Core functionality (enhanced with error handling)
    t: safeT,
    language,
    changeLanguage,
    isLoading,
    error,
    supportedLanguages,
    currentLanguageConfig,
    
    // Namespace-specific functions
    tCommon,
    tNavigation,
    tAuth,
    tDashboard,
    tForms,
    tErrors,
    
    // Utility functions
    formatDate,
    formatTime,
    isRTL,
  };
};

// Export individual namespace hooks for specific use cases
export const useCommonTranslation = () => {
  const { tCommon } = useTranslation();
  return tCommon;
};

export const useNavigationTranslation = () => {
  const { tNavigation } = useTranslation();
  return tNavigation;
};

export const useAuthTranslation = () => {
  const { tAuth } = useTranslation();
  return tAuth;
};

export const useDashboardTranslation = () => {
  const { tDashboard } = useTranslation();
  return tDashboard;
};

export const useFormsTranslation = () => {
  const { tForms } = useTranslation();
  return tForms;
};

export const useErrorsTranslation = () => {
  const { tErrors } = useTranslation();
  return tErrors;
};

// Export the main hook as default
export default useTranslation;