import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from '../../contexts/I18nContext';
import { AuthProvider } from '../../contexts/AuthContext';
import { LanguageSelector } from '../i18n/LanguageSelector';

// Mock Firebase
vi.mock('../../config/firebase', () => ({
  auth: {
    onAuthStateChanged: vi.fn(),
    signOut: vi.fn(),
  },
  db: {},
}));

// Mock useAuth hook
const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
};

vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      signup: vi.fn(),
      resetPassword: vi.fn(),
    }),
  };
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      <I18nProvider>
        {children}
      </I18nProvider>
    </AuthProvider>
  </BrowserRouter>
);

describe('Language Switching Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
  });

  it('should switch language using LanguageSelector', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <LanguageSelector />
      </TestWrapper>
    );

    // Find the language selector
    const languageSelector = screen.getByRole('combobox');
    expect(languageSelector).toBeInTheDocument();

    // Switch to Hungarian
    await user.selectOptions(languageSelector, 'hu');
    
    // Verify the language was changed
    await waitFor(() => {
      expect(languageSelector).toHaveValue('hu');
    });

    // Switch back to English
    await user.selectOptions(languageSelector, 'en');
    
    await waitFor(() => {
      expect(languageSelector).toHaveValue('en');
    });
  });

  it('should persist language selection in localStorage', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <LanguageSelector />
      </TestWrapper>
    );

    const languageSelector = screen.getByRole('combobox');
    
    // Switch to Hungarian
    await user.selectOptions(languageSelector, 'hu');
    
    await waitFor(() => {
      expect(localStorage.getItem('language')).toBe('hu');
    });

    // Switch back to English
    await user.selectOptions(languageSelector, 'en');
    
    await waitFor(() => {
      expect(localStorage.getItem('language')).toBe('en');
    });
  });

  it('should load saved language from localStorage on initialization', () => {
    // Set Hungarian in localStorage before rendering
    localStorage.setItem('language', 'hu');
    
    render(
      <TestWrapper>
        <LanguageSelector />
      </TestWrapper>
    );

    const languageSelector = screen.getByRole('combobox');
    expect(languageSelector).toHaveValue('hu');
  });

  it('should default to English when no language is saved', () => {
    render(
      <TestWrapper>
        <LanguageSelector />
      </TestWrapper>
    );

    const languageSelector = screen.getByRole('combobox');
    expect(languageSelector).toHaveValue('en');
  });

  it('should handle invalid language codes gracefully', () => {
    // Set invalid language in localStorage
    localStorage.setItem('language', 'invalid');
    
    render(
      <TestWrapper>
        <LanguageSelector />
      </TestWrapper>
    );

    const languageSelector = screen.getByRole('combobox');
    // Should fallback to English
    expect(languageSelector).toHaveValue('en');
  });
});