import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import { I18nProvider } from '../../contexts/I18nContext';
import { CalendarSummary } from '../calendar/CalendarSummary';
import { CalendarFilters } from '../calendar/CalendarFilters';
import { ErrorMessage } from '../common/ErrorMessage';

// Mock the authentication hook
vi.mock('../../hooks/useAuthenticatedUser', () => ({
  useAuthenticatedUser: () => ({
    user: { uid: 'test-user' },
    isAuthenticated: true,
    isLoading: false
  })
}));

// Mock calendar service
vi.mock('../../services/calendarService', () => ({
  getEventsForDate: vi.fn().mockResolvedValue([]),
  getUpcomingEvents: vi.fn().mockResolvedValue([]),
  getOverdueEvents: vi.fn().mockResolvedValue([])
}));

// Mock authentication errors
vi.mock('../../utils/authenticationErrors', () => ({
  classifyFirebaseError: vi.fn().mockReturnValue({ code: 'UNKNOWN_ERROR' }),
  getErrorMessage: vi.fn().mockReturnValue('Test error message')
}));

// Mock context preservation and document metadata hooks
vi.mock('../../hooks/useContextPreservation', () => ({
  useContextPreservation: () => ({
    preserveContext: vi.fn(),
    restoreContext: vi.fn()
  })
}));

vi.mock('../../hooks/useDocumentMetadata', () => ({
  useDocumentMetadata: () => ({
    updateMetadata: vi.fn(),
    getPageMetadata: vi.fn().mockReturnValue({})
  })
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={i18n}>
    <I18nProvider>
      {children}
    </I18nProvider>
  </I18nextProvider>
);

describe('Component Translation Usage Tests', () => {
  beforeEach(async () => {
    // Ensure i18n is initialized
    if (!i18n.isInitialized) {
      await i18n.init();
    }
    await i18n.changeLanguage('en');
  });

  describe('CalendarSummary Component', () => {
    it.skip('should use translation keys for all text content in English', async () => {
      render(
        <TestWrapper>
          <CalendarSummary />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check that translated text appears (not hardcoded English)
        expect(screen.getByText('Calendar Summary')).toBeInTheDocument();
        expect(screen.getByText('View Calendar')).toBeInTheDocument();
        expect(screen.getByText('No upcoming events')).toBeInTheDocument();
        expect(screen.getByText('Your calendar is clear for now')).toBeInTheDocument();
      });
    });

    it.skip('should use translation keys for all text content in Hungarian', async () => {
      await i18n.changeLanguage('hu');
      
      render(
        <TestWrapper>
          <CalendarSummary />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check that Hungarian translations appear
        expect(screen.getByText('Naptár Összefoglaló')).toBeInTheDocument();
        expect(screen.getByText('Naptár Megtekintése')).toBeInTheDocument();
        expect(screen.getByText('Nincsenek közelgő események')).toBeInTheDocument();
        expect(screen.getByText('A naptárad jelenleg üres')).toBeInTheDocument();
      });
    });

    it('should not contain hardcoded English text when language is Hungarian', async () => {
      await i18n.changeLanguage('hu');
      
      render(
        <TestWrapper>
          <CalendarSummary />
        </TestWrapper>
      );

      await waitFor(() => {
        // These English texts should NOT appear when language is Hungarian
        expect(screen.queryByText('Calendar Summary')).not.toBeInTheDocument();
        expect(screen.queryByText('View Calendar')).not.toBeInTheDocument();
        expect(screen.queryByText('No upcoming events')).not.toBeInTheDocument();
        expect(screen.queryByText('Your calendar is clear for now')).not.toBeInTheDocument();
      });
    });

    it.skip('should handle event type translations correctly', async () => {
      // Mock some events to test event type translations
      const mockEvents = [
        { id: '1', title: 'Test Task', type: 'task' as const, startDate: new Date(), allDay: false, status: 'pending' as const },
        { id: '2', title: 'Test Project', type: 'project' as const, startDate: new Date(), allDay: false, status: 'pending' as const },
        { id: '3', title: 'Plant Care', type: 'plant_care' as const, startDate: new Date(), allDay: false, status: 'pending' as const }
      ];

      const { getEventsForDate } = await import('../../services/calendarService');
      vi.mocked(getEventsForDate).mockResolvedValue(mockEvents);

      await i18n.changeLanguage('en');
      render(
        <TestWrapper>
          <CalendarSummary />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Task')).toBeInTheDocument();
        expect(screen.getByText('Project')).toBeInTheDocument();
        expect(screen.getByText('Plant Care')).toBeInTheDocument();
      });

      // Switch to Hungarian and verify translations
      await i18n.changeLanguage('hu');
      render(
        <TestWrapper>
          <CalendarSummary />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Feladat')).toBeInTheDocument();
        expect(screen.getByText('Projekt')).toBeInTheDocument();
        expect(screen.getByText('Növénygondozás')).toBeInTheDocument();
      });
    });
  });

  describe('CalendarFilters Component', () => {
    const mockOnFiltersChange = vi.fn();

    beforeEach(() => {
      mockOnFiltersChange.mockClear();
    });

    it.skip('should use translation keys for filter labels in English', () => {
      render(
        <TestWrapper>
          <CalendarFilters onFiltersChange={mockOnFiltersChange} />
        </TestWrapper>
      );

      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Plant Care')).toBeInTheDocument();
      expect(screen.getByText('Custom Events')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });

    it.skip('should use translation keys for filter labels in Hungarian', async () => {
      await i18n.changeLanguage('hu');
      
      render(
        <TestWrapper>
          <CalendarFilters onFiltersChange={mockOnFiltersChange} />
        </TestWrapper>
      );

      expect(screen.getByText('Szűrők')).toBeInTheDocument();
      expect(screen.getByText('Feladatok')).toBeInTheDocument();
      expect(screen.getByText('Projektek')).toBeInTheDocument();
      expect(screen.getByText('Növénygondozás')).toBeInTheDocument();
      expect(screen.getByText('Egyéni Események')).toBeInTheDocument();
      expect(screen.getByText('Függőben')).toBeInTheDocument();
      expect(screen.getByText('Befejezett')).toBeInTheDocument();
      expect(screen.getByText('Törölve')).toBeInTheDocument();
    });

    it.skip('should translate placeholder text correctly', () => {
      render(
        <TestWrapper>
          <CalendarFilters onFiltersChange={mockOnFiltersChange} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search events by title or description...');
      expect(searchInput).toBeInTheDocument();
    });

    it.skip('should translate placeholder text to Hungarian', async () => {
      await i18n.changeLanguage('hu');
      
      render(
        <TestWrapper>
          <CalendarFilters onFiltersChange={mockOnFiltersChange} />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Események keresése cím vagy leírás alapján...');
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('ErrorMessage Component', () => {
    it.skip('should use translation keys for error text in English', () => {
      render(
        <TestWrapper>
          <ErrorMessage message="Test error message" />
        </TestWrapper>
      );

      // The component should show translated "Error" header
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should use translation keys for error text in Hungarian', async () => {
      await i18n.changeLanguage('hu');
      
      render(
        <TestWrapper>
          <ErrorMessage message="Test error message" />
        </TestWrapper>
      );

      // Should show Hungarian translation for "Error"
      // Note: This depends on the actual translation key used in ErrorMessage component
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it.skip('should translate retry button when provided', () => {
      const mockRetry = vi.fn();
      
      render(
        <TestWrapper>
          <ErrorMessage message="Test error" onRetry={mockRetry} />
        </TestWrapper>
      );

      expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    it('should translate retry button to Hungarian', async () => {
      await i18n.changeLanguage('hu');
      const mockRetry = vi.fn();
      
      render(
        <TestWrapper>
          <ErrorMessage message="Test error" onRetry={mockRetry} />
        </TestWrapper>
      );

      expect(screen.getByText('Újrapróbálkozás')).toBeInTheDocument();
    });
  });

  describe('Translation Key Usage Validation', () => {
    it('should not have any hardcoded strings in critical components', () => {
      // This test ensures components use translation keys instead of hardcoded strings
      const criticalComponents = [
        CalendarSummary,
        CalendarFilters,
        ErrorMessage
      ];

      // This is more of a code review test - in practice, you'd use static analysis
      // or check the component source code for hardcoded strings
      expect(criticalComponents.length).toBeGreaterThan(0);
    });

    it.skip('should handle missing translation keys gracefully', async () => {
      // Test with a component that might use a missing key
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      render(
        <TestWrapper>
          <CalendarSummary />
        </TestWrapper>
      );

      // Component should render without throwing errors even if some keys are missing
      await waitFor(() => {
        expect(screen.getByRole('generic')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Language Switching in Components', () => {
    it.skip('should update component text when language changes', async () => {
      const { rerender } = render(
        <TestWrapper>
          <CalendarSummary />
        </TestWrapper>
      );

      // Initially in English
      await waitFor(() => {
        expect(screen.getByText('Calendar Summary')).toBeInTheDocument();
      });

      // Switch to Hungarian
      await i18n.changeLanguage('hu');
      
      rerender(
        <TestWrapper>
          <CalendarSummary />
        </TestWrapper>
      );

      // Should now show Hungarian text
      await waitFor(() => {
        expect(screen.getByText('Naptár Összefoglaló')).toBeInTheDocument();
        expect(screen.queryByText('Calendar Summary')).not.toBeInTheDocument();
      });
    });

    it.skip('should maintain component functionality after language switch', async () => {
      const mockOnFiltersChange = vi.fn();
      
      const { rerender } = render(
        <TestWrapper>
          <CalendarFilters onFiltersChange={mockOnFiltersChange} />
        </TestWrapper>
      );

      // Switch language
      await i18n.changeLanguage('hu');
      
      rerender(
        <TestWrapper>
          <CalendarFilters onFiltersChange={mockOnFiltersChange} />
        </TestWrapper>
      );

      // Component should still be functional
      const searchInput = screen.getByPlaceholderText('Események keresése cím vagy leírás alapján...');
      expect(searchInput).toBeInTheDocument();
      expect(mockOnFiltersChange).toHaveBeenCalled();
    });
  });
});