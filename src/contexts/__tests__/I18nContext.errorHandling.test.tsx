import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { I18nProvider, useI18nContext } from '../I18nContext';
import { i18nErrorHandler } from '../../i18n/errorHandler';

// Mock react-i18next
const mockT = vi.fn();
const mockChangeLanguage = vi.fn();
const mockInit = vi.fn();
const mockReloadResources = vi.fn();
const mockHasResourceBundle = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();

const mockI18nInstance = {
  t: mockT,
  changeLanguage: mockChangeLanguage,
  init: mockInit,
  reloadResources: mockReloadResources,
  hasResourceBundle: mockHasResourceBundle,
  on: mockOn,
  off: mockOff,
  isInitialized: true,
  language: 'en'
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: mockI18nInstance
  })
}));

// Mock hooks
vi.mock('../../hooks/useContextPreservation', () => ({
  useContextPreservation: () => ({
    preserveContext: vi.fn(),
    restoreContext: vi.fn()
  })
}));

vi.mock('../../hooks/useDocumentMetadata', () => ({
  useDocumentMetadata: () => ({
    updateMetadata: vi.fn(),
    getPageMetadata: vi.fn(() => ({}))
  })
}));

// Mock error handler
vi.mock('../../i18n/errorHandler', () => ({
  i18nErrorHandler: {
    logError: vi.fn(),
    clearErrorLog: vi.fn()
  }
}));

// Test component to access context
const TestComponent: React.FC = () => {
  const { t, error, recoverFromError, changeLanguage } = useI18nContext();
  
  const result = t('test:key', { defaultValue: 'Default Value' });
  console.log('[TestComponent] Rendered with result:', result);

  return (
    <div>
      <div data-testid="translation-result">{result}</div>
      <div data-testid="error-state">{error || 'No Error'}</div>
      <button data-testid="recover-button" onClick={recoverFromError}>
        Recover
      </button>
      <button data-testid="change-language-button" onClick={() => changeLanguage('hu')}>
        Change Language
      </button>
    </div>
  );
};

describe.skip('I18nContext Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockT.mockImplementation((key: string, options: any = {}) => options.defaultValue || key);
    mockHasResourceBundle.mockReturnValue(true);
    mockI18nInstance.isInitialized = true;
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle translation errors gracefully', async () => {
    // Mock translation function to throw error
    mockT.mockImplementation(() => {
      throw new Error('Translation error');
    });

    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('translation-result')).toBeInTheDocument();
    });

    // Should show default value when translation fails
    expect(screen.getByTestId('translation-result')).toHaveTextContent('Default Value');
    
    // Should log error to error handler
    expect(i18nErrorHandler.logError).toHaveBeenCalled();
  });

  it('should use fallback language when resource bundle is missing', async () => {
    // Mock missing resource bundle for current language
    mockHasResourceBundle.mockImplementation((lang: string, namespace: string) => {
      return lang === 'en'; // Only English has resources
    });

    // Mock fallback translation
    mockI18nInstance.t = vi.fn().mockImplementation((key: string, options: any = {}) => {
      if (options.lng === 'en') {
        return 'English Fallback';
      }
      return options.defaultValue || key;
    });

    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('translation-result')).toBeInTheDocument();
    });

    // Should use English fallback
    expect(screen.getByTestId('translation-result')).toHaveTextContent('English Fallback');
  });

  it('should handle language change errors', async () => {
    // Mock language change to fail
    mockChangeLanguage.mockRejectedValue(new Error('Language change failed'));

    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('change-language-button')).toBeInTheDocument();
    });

    // Trigger language change
    fireEvent.click(screen.getByTestId('change-language-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).not.toHaveTextContent('No Error');
    });

    // Should show error message
    expect(mockT).toHaveBeenCalledWith('system:i18n.languageChangeFailed', expect.any(Object));
  });

  it('should recover from errors using recoverFromError function', async () => {
    // Initially set up error state
    mockInit.mockRejectedValueOnce(new Error('Init failed'));
    
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('recover-button')).toBeInTheDocument();
    });

    // Mock successful recovery
    mockInit.mockResolvedValue(undefined);
    mockReloadResources.mockResolvedValue(undefined);
    mockI18nInstance.t = vi.fn().mockReturnValue('App Title'); // Successful test translation

    // Trigger recovery
    fireEvent.click(screen.getByTestId('recover-button'));

    await waitFor(() => {
      expect(mockInit).toHaveBeenCalled();
      expect(mockReloadResources).toHaveBeenCalled();
      expect(i18nErrorHandler.clearErrorLog).toHaveBeenCalled();
    });
  });

  it('should handle unsupported language errors', async () => {
    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('change-language-button')).toBeInTheDocument();
    });

    // Mock the context to test unsupported language
    const { changeLanguage } = useI18nContext();
    
    // This should be handled by the component, but we can test the error message
    expect(mockT).toHaveBeenCalledWith('system:i18n.unsupportedLanguage', expect.any(Object));
  });

  it('should provide human-readable fallbacks for missing translation keys', async () => {
    // Mock translation to return the key (indicating missing translation)
    mockT.mockImplementation((key: string) => key);

    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('translation-result')).toBeInTheDocument();
    });

    // Should show default value when key is missing
    expect(screen.getByTestId('translation-result')).toHaveTextContent('Default Value');
  });

  it('should log errors with proper context information', async () => {
    // Mock translation function to throw error
    mockT.mockImplementation(() => {
      throw new Error('Translation error');
    });

    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(i18nErrorHandler.logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          key: expect.any(String),
          language: expect.any(String),
          initialized: expect.any(Boolean),
          errorType: 'translation'
        })
      );
    });
  });

  it('should handle initialization failures gracefully', async () => {
    // Mock initialization failure
    mockI18nInstance.isInitialized = false;
    mockInit.mockRejectedValue(new Error('Initialization failed'));

    render(
      <I18nProvider>
        <TestComponent />
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    // Should show initialization error
    expect(mockT).toHaveBeenCalledWith('system:i18n.initializationFailed', expect.any(Object));
  });
});