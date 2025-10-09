import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation resources
import huCommon from './resources/hu/common.json';
import huNavigation from './resources/hu/navigation.json';
import huAuth from './resources/hu/auth.json';
import huDashboard from './resources/hu/dashboard.json';
import huForms from './resources/hu/forms.json';
import huErrors from './resources/hu/errors.json';

import enCommon from './resources/en/common.json';
import enNavigation from './resources/en/navigation.json';
import enAuth from './resources/en/auth.json';
import enDashboard from './resources/en/dashboard.json';
import enForms from './resources/en/forms.json';
import enErrors from './resources/en/errors.json';

// Translation resources organized by language and namespace
const resources = {
  hu: {
    common: huCommon,
    navigation: huNavigation,
    auth: huAuth,
    dashboard: huDashboard,
    forms: huForms,
    errors: huErrors,
  },
  en: {
    common: enCommon,
    navigation: enNavigation,
    auth: enAuth,
    dashboard: enDashboard,
    forms: enForms,
    errors: enErrors,
  },
};

// Language detector configuration with Hungarian preference
const languageDetectorOptions = {
  // Order of language detection methods
  order: ['localStorage', 'navigator', 'htmlTag'],
  
  // Keys to look for in localStorage
  lookupLocalStorage: 'i18nextLng',
  
  // Cache user language
  caches: ['localStorage'],
  
  // Exclude certain languages from detection
  excludeCacheFor: ['cimode'],
  
  // Check for supported languages only
  checkWhitelist: true,
};

// Error handling configuration
const errorHandlingConfig = {
  // Missing key handler
  missingKeyHandler: (lngs: readonly string[], ns: string, key: string, fallbackValue: string, updateMissing: boolean, options: any): void => {
    const errorMessage = `Missing translation key: ${key} in namespace: ${ns} for language: ${lngs.join(', ')}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.warn(errorMessage);
    } else {
      // Log error but don't expose it to users in production
      console.error(errorMessage);
    }
  },

  // Missing interpolation handler
  missingInterpolationHandler: (text: string, value: any) => {
    const errorMessage = `Missing interpolation value in text: "${text}", missing value: ${JSON.stringify(value)}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.warn(errorMessage);
      return `[MISSING INTERPOLATION: ${JSON.stringify(value)}]`;
    } else {
      console.error(errorMessage);
      // Return text without interpolation
      return text;
    }
  },

  // Parser error handler
  parseMissingKeyHandler: (key: string, defaultValue?: string) => {
    const errorMessage = `Failed to parse translation key: ${key}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.warn(errorMessage);
      return `[PARSE ERROR: ${key}]`;
    } else {
      console.error(errorMessage);
      return defaultValue || key;
    }
  },
};

// Enhanced fallback configuration
const fallbackConfig = {
  // Fallback language chain: Hungarian -> English -> key itself
  fallbackLng: (code: string): string | readonly string[] => {
    // If current language is Hungarian, fallback to English
    if (code === 'hu') {
      return ['en'];
    }
    // If current language is English, fallback to Hungarian
    if (code === 'en') {
      return ['hu'];
    }
    // For any other language, fallback to Hungarian then English
    return ['hu', 'en'];
  },
  
  // Namespace fallback order
  fallbackNS: ['common', 'errors'],
  
  // Fallback to key if all else fails
  returnEmptyString: false,
  returnNull: false,
  returnObjects: false,
};

// i18next configuration with comprehensive error handling
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Resources
    resources,
    
    // Default language (Hungarian)
    lng: 'hu',
    
    // Enhanced fallback configuration
    ...fallbackConfig,
    
    // Supported languages
    supportedLngs: ['hu', 'en'],
    
    // Language detection configuration
    detection: languageDetectorOptions,
    
    // Namespace configuration
    defaultNS: 'common',
    ns: ['common', 'navigation', 'auth', 'dashboard', 'forms', 'errors'],
    
    // Interpolation configuration with error handling
    interpolation: {
      escapeValue: false, // React already escapes values
      skipOnVariables: false, // Don't skip interpolation on variables
      maxReplaces: 1000, // Prevent infinite loops
      format: (value: any, format: string | undefined, lng: string | undefined) => {
        try {
          const locale = (lng === 'hu' ? 'hu-HU' : 'en-US');
          
          // Handle date formatting
          if (format === 'date' && value instanceof Date) {
            return value.toLocaleDateString(locale);
          }
          
          // Handle time formatting
          if (format === 'time' && value instanceof Date) {
            return value.toLocaleTimeString(locale);
          }
          
          // Handle number formatting
          if (format === 'number' && typeof value === 'number') {
            return value.toLocaleString(locale);
          }
          
          // Handle currency formatting
          if (format === 'currency' && typeof value === 'number') {
            return new Intl.NumberFormat(locale, {
              style: 'currency',
              currency: lng === 'hu' ? 'HUF' : 'USD'
            }).format(value);
          }
          
          // Default: return value as string
          return String(value);
        } catch (err) {
          console.error(`Interpolation formatting error for value "${value}" with format "${format || 'undefined'}":`, err);
          return String(value);
        }
      },
    },
    
    // React configuration
    react: {
      useSuspense: false, // Disable suspense for better error handling
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '', // Return empty string for empty nodes
      transSupportBasicHtmlNodes: true, // Support basic HTML in translations
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em'], // Allowed HTML tags
    },
    
    // Error handling configuration
    ...errorHandlingConfig,
    
    // Debug mode (only in development)
    debug: process.env.NODE_ENV === 'development',
    
    // Key separator
    keySeparator: '.',
    
    // Namespace separator
    nsSeparator: ':',
    
    // Load behavior
    load: 'languageOnly', // Load only 'hu' instead of 'hu-HU'
    
    // Clean code
    cleanCode: true,
    
    // Preload languages for better performance
    preload: ['hu', 'en'],
    
    // Lazy loading configuration
    partialBundledLanguages: true,
    
    // Cache configuration
    cache: {
      enabled: true,
      prefix: 'i18next_res_',
      expirationTime: 7 * 24 * 60 * 60 * 1000, // 7 days
      versions: {
        hu: 'v1.0.0',
        en: 'v1.0.0',
      },
    },
  })
  .catch((error: Error) => {
    console.error('Failed to initialize i18next:', error);
    
    // Attempt to initialize with minimal configuration as fallback
    return i18n.init({
      lng: 'hu',
      fallbackLng: 'en',
      resources: {
        hu: { common: { error: 'Hiba történt', loading: 'Betöltés...' } },
        en: { common: { error: 'An error occurred', loading: 'Loading...' } },
      },
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
  });

export default i18n;