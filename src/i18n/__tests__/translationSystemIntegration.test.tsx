import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTranslation } from 'react-i18next';
import React from 'react';
import i18n from '../index';
import { translate as tHelper, setLang } from '../../test/helpers/i18nTestHelper';

// Mock i18n for testing
vi.mock('../index', () => ({
  default: {
    isInitialized: true,
    changeLanguage: vi.fn().mockResolvedValue(undefined),
    language: 'en',
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common:save': 'Save',
        'common:cancel': 'Cancel',
        'common:close': 'Close',
        'forms:save': 'Save',
        'forms:cancel': 'Cancel',
        'accessibility:close': 'Close',
        'accessibility:loading': 'Loading',
      };
      return translations[key] || key;
    }
  }
}));

// Mock useTranslation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common:save': 'Save',
        'common:cancel': 'Cancel',
        'common:close': 'Close',
        'forms:save': 'Save',
        'forms:cancel': 'Cancel',
        'accessibility:close': 'Close',
        'accessibility:loading': 'Loading',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn().mockResolvedValue(undefined),
      isInitialized: true,
    },
  }),
}));

// Simple test components that use actual translation keys
const SimpleTextComponent = ({ translationKey }: { translationKey: string }) => {
  const { t } = useTranslation();
  return <div data-testid="translated-text">{t(translationKey)}</div>;
};

const AccessibilityTestComponent = () => {
  const { t } = useTranslation('accessibility');
  return (
    <div>
      <button aria-label={t('close')} data-testid="close-button">
        {t('close')}
      </button>
      <div role="status" aria-live="polite" data-testid="loading-status">
        {t('loading')}
      </div>
    </div>
  );
};

const FormTestComponent = () => {
  const { t } = useTranslation(['forms', 'common']);
  return (
    <form>
      <button type="submit" data-testid="save-button">
        {t('common:save')}
      </button>
      <button type="button" data-testid="cancel-button">
        {t('common:cancel')}
      </button>
    </form>
  );
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <div>
    {children}
  </div>
);

describe('Translation System Integration Tests', () => {
  beforeEach(async () => {
    // Ensure i18n is initialized
    if (!i18n.isInitialized) {
      await i18n.init();
    }
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    // Clean up any side effects
    vi.clearAllMocks();
  });

  describe('Complete Language Switching Workflow', () => {
    it('should handle complete language switching workflow without errors', async () => {
      const { rerender } = render(
        <TestWrapper>
          <SimpleTextComponent translationKey="common:save" />
          <FormTestComponent />
          <AccessibilityTestComponent />
        </TestWrapper>
      );

      // Initial state - English
      await waitFor(() => {
        expect(screen.getByTestId('save-button')).toHaveTextContent('Save');
        expect(screen.getByTestId('cancel-button')).toHaveTextContent('Cancel');
        expect(screen.getByTestId('close-button')).toHaveTextContent('Close');
      });

      // Switch to Hungarian
      await act(async () => {
        await i18n.changeLanguage('hu');
      });

      rerender(
        <TestWrapper>
          <SimpleTextComponent translationKey="common:save" />
          <FormTestComponent />
          <AccessibilityTestComponent />
        </TestWrapper>
      );

      // Verify Hungarian translations
      await waitFor(() => {
        expect(screen.getByTestId('save-button')).toHaveTextContent('Mentés');
        expect(screen.getByTestId('cancel-button')).toHaveTextContent('Mégse');
        expect(screen.getByTestId('close-button')).toHaveTextContent('Bezárás');
      });

      // Switch back to English
      await act(async () => {
        await i18n.changeLanguage('en');
      });

      rerender(
        <TestWrapper>
          <SimpleTextComponent translationKey="common:save" />
          <FormTestComponent />
          <AccessibilityTestComponent />
        </TestWrapper>
      );

      // Verify English translations are restored
      await waitFor(() => {
        expect(screen.getByTestId('save-button')).toHaveTextContent('Save');
        expect(screen.getByTestId('cancel-button')).toHaveTextContent('Cancel');
        expect(screen.getByTestId('close-button')).toHaveTextContent('Close');
      });
    });

    it('should persist language preference across sessions', async () => {
      const mockStorage: { [key: string]: string } = {};
      
      const setItemSpy = vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      });
      const getItemSpy = vi.fn((key: string) => mockStorage[key] || null);
      
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(setItemSpy);
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(getItemSpy);

      try {
        // Switch to Hungarian
        await act(async () => {
          await i18n.changeLanguage('hu');
        });

        // Verify language was saved to localStorage
        expect(setItemSpy).toHaveBeenCalledWith('i18nextLng', 'hu');
        expect(mockStorage['i18nextLng']).toBe('hu');

        // Language should be set correctly
        expect(i18n.language).toBe('hu');
      } finally {
        vi.restoreAllMocks();
      }
    });

    it('should handle language switching with concurrent updates', async () => {
      const { rerender } = render(
        <TestWrapper>
          <SimpleTextComponent translationKey="common:save" />
        </TestWrapper>
      );

      // Simulate rapid language switches
      const languageSwitches = ['hu', 'en', 'hu', 'en'];
      
      for (const lang of languageSwitches) {
        await act(async () => {
          await i18n.changeLanguage(lang);
        });

        rerender(
          <TestWrapper>
            <SimpleTextComponent translationKey="common:save" />
          </TestWrapper>
        );

        await waitFor(() => {
          const expectedText = lang === 'en' ? 'Save' : 'Mentés';
          expect(screen.getByTestId('translated-text')).toHaveTextContent(expectedText);
        });
      }
    });
  });

  describe('UI Layout Compatibility', () => {
    it('should not break UI layouts with different text lengths', async () => {
      const LongTextComponent = () => {
        const { t } = useTranslation('calendar');
        return (
          <div style={{ width: '200px', overflow: 'hidden' }}>
            <button 
              data-testid="long-text-button"
              style={{ width: '100%', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}
            >
              {t('noUpcomingEvents')}
            </button>
          </div>
        );
      };

      const { rerender } = render(
        <TestWrapper>
          <LongTextComponent />
        </TestWrapper>
      );

      // Test English text
      await waitFor(() => {
        const button = screen.getByTestId('long-text-button');
        expect(button).toBeInTheDocument();
        expect(button.textContent).toBe('No upcoming events');
      });

      // Switch to Hungarian (longer text)
      await act(async () => {
        await i18n.changeLanguage('hu');
      });

      rerender(
        <TestWrapper>
          <LongTextComponent />
        </TestWrapper>
      );

      // Verify Hungarian text fits and doesn't break layout
      await waitFor(() => {
        const button = screen.getByTestId('long-text-button');
        expect(button).toBeInTheDocument();
        expect(button.textContent).toBe('Nincsenek közelgő események');
        
        // Button should still be accessible and have proper styling
        expect(button).toHaveStyle({ width: '100%' });
        expect(button).toHaveStyle({ whiteSpace: 'nowrap' });
        expect(button).toHaveStyle({ textOverflow: 'ellipsis' });
      });
    });

    it('should handle text direction changes correctly', async () => {
      const DirectionalComponent = () => {
        const { t } = useTranslation('common');
        return (
          <div dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} data-testid="directional-container">
            <p data-testid="save-text">{t('save')}</p>
            <p data-testid="cancel-text">{t('cancel')}</p>
          </div>
        );
      };

      render(
        <TestWrapper>
          <DirectionalComponent />
        </TestWrapper>
      );

      // Test LTR direction for supported languages
      await waitFor(() => {
        const container = screen.getByTestId('directional-container');
        expect(container).toHaveAttribute('dir', 'ltr');
        expect(screen.getByTestId('save-text')).toHaveTextContent('Save');
        expect(screen.getByTestId('cancel-text')).toHaveTextContent('Cancel');
      });
    });

    it('should maintain responsive design with translated content', async () => {
      const ResponsiveComponent = () => {
        const { t } = useTranslation('calendar');
        return (
          <div className="responsive-container" style={{ display: 'flex', flexWrap: 'wrap', maxWidth: '300px' }}>
            <span className="tag" style={{ margin: '2px', padding: '4px', border: '1px solid #ccc' }} data-testid="today-tag">
              {t('today')}
            </span>
            <span className="tag" style={{ margin: '2px', padding: '4px', border: '1px solid #ccc' }} data-testid="tomorrow-tag">
              {t('tomorrow')}
            </span>
            <span className="tag" style={{ margin: '2px', padding: '4px', border: '1px solid #ccc' }} data-testid="upcoming-tag">
              {t('upcoming')}
            </span>
          </div>
        );
      };

      const { rerender } = render(
        <TestWrapper>
          <ResponsiveComponent />
        </TestWrapper>
      );

      // Test English layout
      await waitFor(() => {
        expect(screen.getByTestId('today-tag')).toHaveTextContent('Today');
        expect(screen.getByTestId('tomorrow-tag')).toHaveTextContent('Tomorrow');
        expect(screen.getByTestId('upcoming-tag')).toHaveTextContent('Upcoming');
      });

      // Switch to Hungarian and verify layout still works
      await act(async () => {
        await i18n.changeLanguage('hu');
      });

      rerender(
        <TestWrapper>
          <ResponsiveComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('today-tag')).toHaveTextContent('Ma');
        expect(screen.getByTestId('tomorrow-tag')).toHaveTextContent('Holnap');
        expect(screen.getByTestId('upcoming-tag')).toHaveTextContent('Közelgő');
      });
    });
  });

  describe('Accessibility Features with Translated Content', () => {
    it('should translate ARIA labels correctly', async () => {
      render(
        <TestWrapper>
          <AccessibilityTestComponent />
        </TestWrapper>
      );

      // Test English ARIA labels
      await waitFor(() => {
        const closeButton = screen.getByTestId('close-button');
        expect(closeButton).toHaveAttribute('aria-label', 'Close');
        expect(closeButton).toHaveTextContent('Close');
      });
    });

    it.skip('*Hungarian', async () => {
      await act(async () => {
        await i18n.changeLanguage('hu');
      });

      render(
        <TestWrapper>
          <AccessibilityTestComponent />
        </TestWrapper>
      );

      // Test Hungarian ARIA labels
      await waitFor(() => {
        const closeButton = screen.getByTestId('close-button');
        expect(closeButton).toHaveAttribute('aria-label', 'Bezárás');
        expect(closeButton).toHaveTextContent('Bezárás');
      });
    });

    it('should handle screen reader announcements in different languages', async () => {
      const AnnouncementComponent = () => {
        const { t } = useTranslation(['loading', 'system']);
        return (
          <div>
            <div role="status" aria-live="polite" data-testid="loading-status">
              {t('loading:loading')}
            </div>
            <div role="alert" aria-live="assertive" data-testid="update-alert">
              {t('system:updateAvailable')}
            </div>
          </div>
        );
      };

      const { rerender } = render(
        <TestWrapper>
          <AnnouncementComponent />
        </TestWrapper>
      );

      // Test English announcements
      await waitFor(() => {
        expect(screen.getByTestId('loading-status')).toHaveTextContent('Loading...');
        expect(screen.getByTestId('update-alert')).toHaveTextContent('Update Available');
      });

      // Switch to Hungarian
      await act(async () => {
        await i18n.changeLanguage('hu');
      });

      rerender(
        <TestWrapper>
          <AnnouncementComponent />
        </TestWrapper>
      );

      // Test Hungarian announcements
      await waitFor(() => {
        expect(screen.getByTestId('loading-status')).toHaveTextContent('Betöltés...');
        expect(screen.getByTestId('update-alert')).toHaveTextContent('Frissítés Elérhető');
      });
    });

    it('should maintain focus management with translated content', async () => {
      const user = userEvent.setup();
      
      const FocusComponent = () => {
        const { t } = useTranslation(['common', 'accessibility']);
        return (
          <div>
            <button data-testid="save-focus-button">{t('common:save')}</button>
            <button data-testid="cancel-focus-button">{t('common:cancel')}</button>
            <button data-testid="close-focus-button" aria-label={t('accessibility:close')}>
              {t('accessibility:close')}
            </button>
          </div>
        );
      };

      render(
        <TestWrapper>
          <FocusComponent />
        </TestWrapper>
      );

      // Test focus navigation in English
      await waitFor(() => {
        expect(screen.getByTestId('save-focus-button')).toHaveTextContent('Save');
        expect(screen.getByTestId('cancel-focus-button')).toHaveTextContent('Cancel');
        expect(screen.getByTestId('close-focus-button')).toHaveTextContent('Close');
      });

      // Test keyboard navigation
      await user.tab();
      expect(screen.getByTestId('save-focus-button')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTestId('cancel-focus-button')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByTestId('close-focus-button')).toHaveFocus();
    });

    it('should handle form validation messages in different languages', async () => {
      const ValidationComponent = () => {
        const { t } = useTranslation('forms');
        const [error] = React.useState(true);
        
        return (
          <div>
            <input 
              aria-invalid={error}
              aria-describedby="error-message"
              data-testid="validation-input"
            />
            {error && (
              <div id="error-message" role="alert" data-testid="validation-error">
                {t('validation.required', 'This field is required')}
              </div>
            )}
          </div>
        );
      };

      const { rerender } = render(
        <TestWrapper>
          <ValidationComponent />
        </TestWrapper>
      );

      // Test English validation message
      await waitFor(() => {
        expect(screen.getByTestId('validation-error')).toHaveTextContent('This field is required');
        expect(screen.getByTestId('validation-error')).toHaveAttribute('role', 'alert');
      });

      // Switch to Hungarian
      await act(async () => {
        await i18n.changeLanguage('hu');
      });

      rerender(
        <TestWrapper>
          <ValidationComponent />
        </TestWrapper>
      );

      // Test Hungarian validation message
      await waitFor(() => {
        expect(screen.getByTestId('validation-error')).toHaveTextContent('Ez a mező kötelező');
        expect(screen.getByTestId('validation-error')).toHaveAttribute('role', 'alert');
      });
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle translation errors gracefully without breaking UI', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const ErrorProneComponent = () => {
        const { useTranslation } = require('react-i18next');
        const { t } = useTranslation();
        return (
          <div>
            <p>{t('nonexistent.key', 'Fallback text')}</p>
            <p>{t('another.missing.key')}</p>
          </div>
        );
      };

      render(
        <TestWrapper>
          <ErrorProneComponent />
        </TestWrapper>
      );

      // Component should render without crashing
      await waitFor(() => {
        expect(screen.getByText('Fallback text')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('should maintain performance with frequent language switches', async () => {
      const startTime = performance.now();
      
      const { rerender } = render(
        <TestWrapper>
          <SimpleTextComponent translationKey="common:save" />
        </TestWrapper>
      );

      // Perform multiple language switches
      for (let i = 0; i < 10; i++) {
        const lang = i % 2 === 0 ? 'hu' : 'en';
        await act(async () => {
          await i18n.changeLanguage(lang);
        });

        rerender(
          <TestWrapper>
            <SimpleTextComponent translationKey="common:save" />
          </TestWrapper>
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('should handle memory cleanup properly', async () => {
      const { unmount } = render(
        <TestWrapper>
          <SimpleTextComponent translationKey="common:save" />
        </TestWrapper>
      );

      // Switch language and then unmount
      await act(async () => {
        await i18n.changeLanguage('hu');
      });

      // Should unmount without errors
      expect(() => unmount()).not.toThrow();
    });
  });
});