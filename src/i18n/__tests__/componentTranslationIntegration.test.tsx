import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../index';
import { ErrorMessage } from '../../components/common/ErrorMessage';

// Simple test wrapper using only react-i18next
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={i18n}>
    {children}
  </I18nextProvider>
);

describe.skip('Component Translation Integration Tests', () => {
  beforeEach(async () => {
    // Ensure i18n is initialized
    if (!i18n.isInitialized) {
      await i18n.init();
    }
    await i18n.changeLanguage('en');
  });

  describe('ErrorMessage Component Translation', () => {
    it('should display translated error header in English', async () => {
      render(
        <TestWrapper>
          <ErrorMessage message="Test error message" />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check for the actual translated text that appears
        expect(screen.getByText('An unknown error occurred')).toBeInTheDocument();
        expect(screen.getByText('Test error message')).toBeInTheDocument();
      });
    });

    it('should display translated retry button in English', async () => {
      const mockRetry = vi.fn();
      
      render(
        <TestWrapper>
          <ErrorMessage message="Test error" onRetry={mockRetry} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should display translated retry button in Hungarian', async () => {
      await i18n.changeLanguage('hu');
      const mockRetry = vi.fn();
      
      render(
        <TestWrapper>
          <ErrorMessage message="Test error" onRetry={mockRetry} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Újrapróbálkozás')).toBeInTheDocument();
      });
    });

    it('should switch language correctly and update text', async () => {
      const mockRetry = vi.fn();
      
      const { rerender } = render(
        <TestWrapper>
          <ErrorMessage message="Test error" onRetry={mockRetry} />
        </TestWrapper>
      );

      // Initially in English
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Switch to Hungarian
      await i18n.changeLanguage('hu');
      
      rerender(
        <TestWrapper>
          <ErrorMessage message="Test error" onRetry={mockRetry} />
        </TestWrapper>
      );

      // Should now show Hungarian text
      await waitFor(() => {
        expect(screen.getByText('Újrapróbálkozás')).toBeInTheDocument();
        expect(screen.queryByText('Retry')).not.toBeInTheDocument();
      });
    });
  });

  describe('Translation System Behavior', () => {
    it('should handle missing translation keys gracefully', async () => {
      // This test verifies that the translation system doesn't break when keys are missing
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      render(
        <TestWrapper>
          <ErrorMessage message="Test with missing keys" />
        </TestWrapper>
      );

      // Component should render without throwing errors
      await waitFor(() => {
        expect(screen.getByText('Test with missing keys')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('should maintain functionality across rapid language switches', async () => {
      const mockRetry = vi.fn();
      
      const { rerender } = render(
        <TestWrapper>
          <ErrorMessage message="Test error" onRetry={mockRetry} />
        </TestWrapper>
      );

      // Rapid language switching
      const languages = ['en', 'hu', 'en', 'hu'];
      
      for (const lang of languages) {
        await i18n.changeLanguage(lang);
        
        rerender(
          <TestWrapper>
            <ErrorMessage message="Test error" onRetry={mockRetry} />
          </TestWrapper>
        );

        await waitFor(() => {
          const expectedText = lang === 'en' ? 'Retry' : 'Újrapróbálkozás';
          expect(screen.getByText(expectedText)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Translation Key Validation', () => {
    it('should have all required translation keys available', async () => {
      // Test that critical translation keys exist in both languages
      const criticalKeys = [
        'system:retry',
        'errors:general.unknownError',
        'calendar:summary',
        'calendar:today',
        'loading:loading',
        'accessibility:close'
      ];

      for (const key of criticalKeys) {
        // Test English
        await i18n.changeLanguage('en');
        expect(i18n.exists(key)).toBe(true);
        const enTranslation = i18n.t(key);
        expect(enTranslation).toBeTruthy();
        expect(enTranslation).not.toBe(key);

        // Test Hungarian
        await i18n.changeLanguage('hu');
        expect(i18n.exists(key)).toBe(true);
        const huTranslation = i18n.t(key);
        expect(huTranslation).toBeTruthy();
        expect(huTranslation).not.toBe(key);
        expect(huTranslation).not.toBe(enTranslation); // Should be different from English
      }
    });

    it('should provide fallback values for missing keys', () => {
      const missingKey = 'nonexistent:missing.key';
      const fallbackValue = 'Fallback Text';
      
      const result = i18n.t(missingKey, { defaultValue: fallbackValue });
      expect(result).toBe(fallbackValue);
    });

    it('should handle interpolation correctly', () => {
      const key = 'system:lastSync';
      const timeValue = 'now';
      
      const result = i18n.t(key, { time: timeValue });
      expect(result).toContain('Last sync:');
      expect(result).toContain(timeValue);
    });
  });

  describe('Namespace Coverage', () => {
    it('should have all required namespaces loaded', () => {
      const requiredNamespaces = [
        'common',
        'calendar',
        'system',
        'accessibility',
        'loading',
        'forms',
        'errors'
      ];

      requiredNamespaces.forEach(namespace => {
        expect(i18n.hasResourceBundle('en', namespace)).toBe(true);
        expect(i18n.hasResourceBundle('hu', namespace)).toBe(true);
      });
    });

    it('should load namespace resources correctly', () => {
      // Test that each namespace has some content
      const namespaces = ['common', 'calendar', 'system', 'accessibility', 'loading'];
      
      namespaces.forEach(namespace => {
        const enBundle = i18n.getResourceBundle('en', namespace);
        const huBundle = i18n.getResourceBundle('hu', namespace);
        
        expect(enBundle).toBeTruthy();
        expect(huBundle).toBeTruthy();
        expect(Object.keys(enBundle).length).toBeGreaterThan(0);
        expect(Object.keys(huBundle).length).toBeGreaterThan(0);
      });
    });
  });
});