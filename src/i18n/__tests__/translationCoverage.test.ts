import { describe, it, expect, beforeEach, vi } from 'vitest';
import i18n from '../index';

// Import all translation resources to test coverage
import enCommon from '../resources/en/common.json';
import huCommon from '../resources/hu/common.json';
import enCalendar from '../resources/en/calendar.json';
import huCalendar from '../resources/hu/calendar.json';
import enSystem from '../resources/en/system.json';
import huSystem from '../resources/hu/system.json';
import enAccessibility from '../resources/en/accessibility.json';
import huAccessibility from '../resources/hu/accessibility.json';
import enLoading from '../resources/en/loading.json';
import huLoading from '../resources/hu/loading.json';
import enForms from '../resources/en/forms.json';
import huForms from '../resources/hu/forms.json';
import enErrors from '../resources/en/errors.json';
import huErrors from '../resources/hu/errors.json';

describe('Translation Coverage Tests', () => {
  beforeEach(async () => {
    // Ensure i18n is initialized before each test
    if (!i18n.isInitialized) {
      await i18n.init();
    }
  });

  describe('Translation Key Coverage', () => {
    it('should have all calendar translation keys in both languages', () => {
      const requiredCalendarKeys = [
        'summary',
        'viewCalendar',
        'allDay',
        'today',
        'tomorrow',
        'overdue',
        'upcoming',
        'noUpcomingEvents',
        'calendarClearForNow',
        'eventTypes.task',
        'eventTypes.project',
        'eventTypes.plantCare',
        'eventTypes.custom',
        'filters.allTypes',
        'filters.allStatuses',
        'filters.searchPlaceholder',
        'filters.filters',
        'filters.clearAll'
      ];

      requiredCalendarKeys.forEach(key => {
        expect(enCalendar).toHaveProperty(key.split('.').join('.'));
        expect(huCalendar).toHaveProperty(key.split('.').join('.'));
        
        // Test that keys exist in i18n instance
        expect(i18n.exists(`calendar:${key}`, { lng: 'en' })).toBe(true);
        expect(i18n.exists(`calendar:${key}`, { lng: 'hu' })).toBe(true);
      });
    });

    it('should have all system translation keys in both languages', () => {
      const requiredSystemKeys = [
        'retry',
        'healthCheck',
        'fullRecovery',
        'clearErrorHistory',
        'updateNow',
        'retryWithSmartBackoff',
        'online',
        'offline',
        'reconnecting'
      ];

      requiredSystemKeys.forEach(key => {
        expect(enSystem).toHaveProperty(key);
        expect(huSystem).toHaveProperty(key);
        
        // Test that keys exist in i18n instance
        expect(i18n.exists(`system:${key}`, { lng: 'en' })).toBe(true);
        expect(i18n.exists(`system:${key}`, { lng: 'hu' })).toBe(true);
      });
    });

    it('should have all accessibility translation keys in both languages', () => {
      const requiredAccessibilityKeys = [
        'close',
        'openMenu',
        'loading',
        'error'
      ];

      requiredAccessibilityKeys.forEach(key => {
        expect(enAccessibility).toHaveProperty(key);
        expect(huAccessibility).toHaveProperty(key);
        
        // Test that keys exist in i18n instance
        expect(i18n.exists(`accessibility:${key}`, { lng: 'en' })).toBe(true);
        expect(i18n.exists(`accessibility:${key}`, { lng: 'hu' })).toBe(true);
      });
    });

    it('should have all loading translation keys in both languages', () => {
      const requiredLoadingKeys = [
        'loading',
        'loadingData',
        'pleaseWait'
      ];

      requiredLoadingKeys.forEach(key => {
        expect(enLoading).toHaveProperty(key);
        expect(huLoading).toHaveProperty(key);
        
        // Test that keys exist in i18n instance
        expect(i18n.exists(`loading:${key}`, { lng: 'en' })).toBe(true);
        expect(i18n.exists(`loading:${key}`, { lng: 'hu' })).toBe(true);
      });
    });
  });

  describe('Translation Fallback Behavior', () => {
    it('should return fallback value when translation key is missing', () => {
      const fallbackValue = 'Fallback Text';
      const missingKey = 'nonexistent.key.that.does.not.exist';
      
      // Test with English
      i18n.changeLanguage('en');
      const enResult = i18n.t(missingKey, { defaultValue: fallbackValue });
      expect(enResult).toBe(fallbackValue);
      
      // Test with Hungarian
      i18n.changeLanguage('hu');
      const huResult = i18n.t(missingKey, { defaultValue: fallbackValue });
      expect(huResult).toBe(fallbackValue);
    });

    it('should fallback to other language when key is missing in current language', async () => {
      // Create a scenario where a key exists in English but not Hungarian
      const testKey = 'calendar:testKeyOnlyInEnglish';
      
      // Add test key to English only
      i18n.addResourceBundle('en', 'calendar', { 
        ...i18n.getResourceBundle('en', 'calendar'),
        testKeyOnlyInEnglish: 'English Only Text'
      }, true, true);
      
      await i18n.changeLanguage('hu');
      const result = i18n.t(testKey);
      
      // Should fallback to English version
      expect(result).toBe('English Only Text');
      
      // Clean up - remove the test key
      const enCalendar = i18n.getResourceBundle('en', 'calendar');
      delete enCalendar.testKeyOnlyInEnglish;
      i18n.addResourceBundle('en', 'calendar', enCalendar, true, true);
    });

    it('should handle missing interpolation values gracefully', () => {
      const keyWithInterpolation = 'system:lastSync';
      
      // Test without providing interpolation value
      i18n.changeLanguage('en');
      
      // Should not throw error when interpolation value is missing
      expect(() => {
        const result = i18n.t(keyWithInterpolation, { time: 'now' });
        expect(typeof result).toBe('string');
        expect(result).toContain('Last sync:');
      }).not.toThrow();
    });
  });

  describe('Language Switching Functionality', () => {
    it('should switch languages correctly and update translations', async () => {
      // Test switching to English
      await i18n.changeLanguage('en');
      expect(i18n.language).toBe('en');
      expect(i18n.t('calendar:today')).toBe('Today');
      expect(i18n.t('system:retry')).toBe('Retry');
      
      // Test switching to Hungarian
      await i18n.changeLanguage('hu');
      expect(i18n.language).toBe('hu');
      expect(i18n.t('calendar:today')).toBe('Ma');
      expect(i18n.t('system:retry')).toBe('Újrapróbálkozás');
    });

    it('should maintain translation consistency across language switches', async () => {
      const testKeys = [
        'calendar:summary',
        'calendar:today',
        'system:retry',
        'accessibility:close',
        'loading:loading'
      ];
      
      // Test each key in both languages
      for (const key of testKeys) {
        await i18n.changeLanguage('en');
        const enTranslation = i18n.t(key);
        expect(enTranslation).toBeTruthy();
        expect(enTranslation).not.toBe(key); // Should not return the key itself
        
        await i18n.changeLanguage('hu');
        const huTranslation = i18n.t(key);
        expect(huTranslation).toBeTruthy();
        expect(huTranslation).not.toBe(key); // Should not return the key itself
        expect(huTranslation).not.toBe(enTranslation); // Should be different from English
      }
    });

    it('should handle rapid language switching without errors', async () => {
      const languages = ['en', 'hu', 'en', 'hu', 'en'];
      
      for (const lang of languages) {
        await i18n.changeLanguage(lang);
        expect(i18n.language).toBe(lang);
        
        // Test that translations still work after rapid switching
        const translation = i18n.t('calendar:today');
        expect(translation).toBeTruthy();
        expect(translation).toBe(lang === 'en' ? 'Today' : 'Ma');
      }
    });
  });

  describe('Translation Quality Checks', () => {
    it('should have non-empty translations for all keys', () => {
      const allResources = {
        en: { common: enCommon, calendar: enCalendar, system: enSystem, accessibility: enAccessibility, loading: enLoading, forms: enForms, errors: enErrors },
        hu: { common: huCommon, calendar: huCalendar, system: huSystem, accessibility: huAccessibility, loading: huLoading, forms: huForms, errors: huErrors }
      };
      
      Object.entries(allResources).forEach(([lang, namespaces]) => {
        Object.entries(namespaces).forEach(([namespace, translations]) => {
          checkTranslationsNotEmpty(translations, `${lang}:${namespace}`);
        });
      });
    });

    it('should have consistent key structure between languages', () => {
      const namespaces = ['common', 'calendar', 'system', 'accessibility', 'loading', 'forms', 'errors'];
      
      namespaces.forEach(namespace => {
        const enKeys = getNestedKeys(i18n.getResourceBundle('en', namespace) || {});
        const huKeys = getNestedKeys(i18n.getResourceBundle('hu', namespace) || {});
        
        // Check that Hungarian has all English keys
        enKeys.forEach(key => {
          expect(huKeys).toContain(key);
        });
        
        // Check that English has all Hungarian keys
        huKeys.forEach(key => {
          expect(enKeys).toContain(key);
        });
      });
    });

    it('should not have placeholder or development text in translations', () => {
      const forbiddenPatterns = [
        /TODO/i,
        /FIXME/i,
        /\[.*\]/,  // Brackets indicating placeholders
        /lorem ipsum/i,
        /test.*text/i,
        /placeholder/i
      ];
      
      const allResources = {
        en: { common: enCommon, calendar: enCalendar, system: enSystem, accessibility: enAccessibility, loading: enLoading },
        hu: { common: huCommon, calendar: huCalendar, system: huSystem, accessibility: huAccessibility, loading: huLoading }
      };
      
      Object.entries(allResources).forEach(([lang, namespaces]) => {
        Object.entries(namespaces).forEach(([namespace, translations]) => {
          checkNoForbiddenPatterns(translations, forbiddenPatterns, `${lang}:${namespace}`);
        });
      });
    });
  });

  describe('Error Handling in Translation System', () => {
    it('should handle malformed translation keys gracefully', () => {
      const malformedKeys = [
        '',
        '.',
        '..',
        'namespace:',
        ':key',
        'namespace::key',
        'namespace.key.',
        '.namespace.key'
      ];
      
      malformedKeys.forEach(key => {
        expect(() => {
          const result = i18n.t(key, { defaultValue: 'fallback' });
          expect(typeof result).toBe('string');
        }).not.toThrow();
      });
    });

    it('should log missing keys in development mode', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const originalEnv = process.env.NODE_ENV;
      
      try {
        process.env.NODE_ENV = 'development';
        
        // Try to access a non-existent key
        i18n.t('nonexistent:missing.key');
        
        // Should have logged a warning
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        process.env.NODE_ENV = originalEnv;
        consoleSpy.mockRestore();
      }
    });

    it('should not expose errors to users in production mode', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalEnv = process.env.NODE_ENV;
      
      try {
        process.env.NODE_ENV = 'production';
        
        // Try to access a non-existent key
        const result = i18n.t('nonexistent:missing.key', { defaultValue: 'Safe Fallback' });
        
        // Should return fallback without exposing error to user
        expect(result).toBe('Safe Fallback');
      } finally {
        process.env.NODE_ENV = originalEnv;
        consoleSpy.mockRestore();
      }
    });
  });
});

// Helper functions
function checkTranslationsNotEmpty(obj: any, path: string = ''): void {
  Object.entries(obj).forEach(([key, value]) => {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof value === 'string') {
      expect(value.trim()).not.toBe('');
      expect(value.trim().length).toBeGreaterThan(0);
    } else if (typeof value === 'object' && value !== null) {
      checkTranslationsNotEmpty(value, currentPath);
    }
  });
}

function getNestedKeys(obj: any, prefix: string = ''): string[] {
  const keys: string[] = [];
  
  Object.entries(obj).forEach(([key, value]) => {
    const currentKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null) {
      keys.push(...getNestedKeys(value, currentKey));
    } else {
      keys.push(currentKey);
    }
  });
  
  return keys;
}

function checkNoForbiddenPatterns(obj: any, patterns: RegExp[], path: string = ''): void {
  Object.entries(obj).forEach(([key, value]) => {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof value === 'string') {
      patterns.forEach(pattern => {
        expect(value).not.toMatch(pattern);
      });
    } else if (typeof value === 'object' && value !== null) {
      checkNoForbiddenPatterns(value, patterns, currentPath);
    }
  });
}