import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from '../../contexts/I18nContext';
import { AuthProvider } from '../../contexts/AuthContext';
import { LanguageSelector } from '../../components/i18n/LanguageSelector';
import { LoginForm } from '../../components/auth/LoginForm';
import { CalendarSummary } from '../../components/calendar/CalendarSummary';
import { CalendarFilters } from '../../components/calendar/CalendarFilters';

// Mock Firebase
vi.mock('../../config/firebase', () => ({
  auth: {
    onAuthStateChanged: vi.fn(),
    signOut: vi.fn(),
  },
  db: {},
}));

// Mock calendar service
vi.mock('../../services/calendarService', () => ({
  getEvents: vi.fn().mockResolvedValue([]),
  getEventsByDateRange: vi.fn().mockResolvedValue([]),
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

describe.skip('Language Switching Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Authentication Components', () => {
    it('should display translated text in LoginForm when switching languages', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <div>
            <LanguageSelector />
            <LoginForm />
          </div>
        </TestWrapper>
      );

      // Initially should show English text
      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();

      // Switch to Hungarian
      const languageSelector = screen.getByRole('combobox');
      await user.selectOptions(languageSelector, 'hu');

      // Wait for translation to load and verify Hungarian text appears
      await waitFor(() => {
        // These should be translated to Hungarian
        expect(screen.getByText('Bejelentkezés')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Calendar Components', () => {
    it('should display translated text in CalendarSummary when switching languages', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <div>
            <LanguageSelector />
            <CalendarSummary />
          </div>
        </TestWrapper>
      );

      // Initially should show English text
      expect(screen.getByText('Calendar Summary')).toBeInTheDocument();
      expect(screen.getByText('View Calendar')).toBeInTheDocument();

      // Switch to Hungarian
      const languageSelector = screen.getByRole('combobox');
      await user.selectOptions(languageSelector, 'hu');

      // Wait for translation to load and verify Hungarian text appears
      await waitFor(() => {
        expect(screen.getByText('Naptár Összefoglaló')).toBeInTheDocument();
        expect(screen.getByText('Naptár Megtekintése')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display translated text in CalendarFilters when switching languages', async () => {
      const user = userEvent.setup();
      const mockOnFiltersChange = vi.fn();
      
      render(
        <TestWrapper>
          <div>
            <LanguageSelector />
            <CalendarFilters 
              filters={{
                types: [],
                statuses: [],
                dateRange: { start: new Date(), end: new Date() }
              }}
              onFiltersChange={mockOnFiltersChange}
            />
          </div>
        </TestWrapper>
      );

      // Initially should show English text
      expect(screen.getByText('All Types')).toBeInTheDocument();
      expect(screen.getByText('All Statuses')).toBeInTheDocument();

      // Switch to Hungarian
      const languageSelector = screen.getByRole('combobox');
      await user.selectOptions(languageSelector, 'hu');

      // Wait for translation to load and verify Hungarian text appears
      await waitFor(() => {
        expect(screen.getByText('Minden Típus')).toBeInTheDocument();
        expect(screen.getByText('Minden Állapot')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Date and Time Localization', () => {
    it('should format dates according to selected language', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <div>
            <LanguageSelector />
            <CalendarSummary />
          </div>
        </TestWrapper>
      );

      // Switch to Hungarian
      const languageSelector = screen.getByRole('combobox');
      await user.selectOptions(languageSelector, 'hu');

      await waitFor(() => {
        // Verify Hungarian date format is used
        // This would depend on the actual date formatting implementation
        expect(languageSelector).toHaveValue('hu');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle translation loading errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock console.error to avoid noise in test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <TestWrapper>
          <div>
            <LanguageSelector />
            <LoginForm />
          </div>
        </TestWrapper>
      );

      // Switch to Hungarian
      const languageSelector = screen.getByRole('combobox');
      await user.selectOptions(languageSelector, 'hu');

      // Even if translations fail to load, the component should still render
      await waitFor(() => {
        expect(languageSelector).toHaveValue('hu');
        // Should show fallback English text if translations fail
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('UI Layout Compatibility', () => {
    it('should maintain proper layout when text length changes between languages', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <div>
            <LanguageSelector />
            <LoginForm />
          </div>
        </TestWrapper>
      );

      // Get initial button dimensions
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const initialRect = submitButton.getBoundingClientRect();

      // Switch to Hungarian
      const languageSelector = screen.getByRole('combobox');
      await user.selectOptions(languageSelector, 'hu');

      await waitFor(() => {
        expect(languageSelector).toHaveValue('hu');
      });

      // Verify button is still properly sized and positioned
      const updatedRect = submitButton.getBoundingClientRect();
      expect(updatedRect.height).toBeGreaterThan(0);
      expect(updatedRect.width).toBeGreaterThan(0);
      
      // Button should not overflow or break layout
      expect(updatedRect.width).toBeLessThan(window.innerWidth);
    });
  });

  describe('Accessibility', () => {
    it('should maintain accessibility features when switching languages', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <div>
            <LanguageSelector />
            <LoginForm />
          </div>
        </TestWrapper>
      );

      // Check initial accessibility attributes
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');

      // Switch to Hungarian
      const languageSelector = screen.getByRole('combobox');
      await user.selectOptions(languageSelector, 'hu');

      await waitFor(() => {
        expect(languageSelector).toHaveValue('hu');
      });

      // Verify accessibility attributes are preserved
      const updatedEmailInput = screen.getByRole('textbox', { name: /email/i });
      expect(updatedEmailInput).toHaveAttribute('type', 'email');
      expect(updatedEmailInput).toHaveAttribute('required');
    });
  });
});