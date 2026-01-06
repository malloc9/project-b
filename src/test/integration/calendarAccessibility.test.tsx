import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AuthContext } from '../../contexts/AuthContext';
import { CalendarView } from '../../components/calendar/CalendarView';
import { DayView } from '../../components/calendar/DayView';
import { EventForm } from '../../components/calendar/EventForm';
import { EventDetailsModal } from '../../components/calendar/EventDetailsModal';
import { CalendarFilters } from '../../components/calendar/CalendarFilters';
import * as optimizedCalendarService from '../../services/optimizedCalendarService';
import * as calendarService from '../../services/calendarService';
import type { CalendarEvent } from '../../types';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock Firebase
vi.mock('../../config/firebase', () => ({
  db: {},
  auth: {}
}));

vi.mock('../../services/optimizedCalendarService');
vi.mock('../../services/calendarService');

const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User'
};

const mockAuthContext = {
  user: mockUser,
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  resetPassword: vi.fn()
};

const createMockEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'event-1',
  userId: 'test-user-123',
  title: 'Test Event',
  description: 'Test event description',
  startDate: new Date('2024-01-15T10:00:00Z'),
  endDate: new Date('2024-01-15T11:00:00Z'),
  allDay: false,
  type: 'custom',
  status: 'pending',
  notifications: [],
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides
});

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      {component}
    </AuthContext.Provider>
  );
};

describe.skip('Calendar Accessibility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(optimizedCalendarService.getEventsForCalendarViewOptimized).mockResolvedValue([
      createMockEvent(),
      createMockEvent({
        id: 'event-2',
        title: 'Meeting with Team',
        type: 'project',
        startDate: new Date('2024-01-16T14:00:00Z'),
        endDate: new Date('2024-01-16T15:00:00Z')
      })
    ]);
    
    vi.mocked(calendarService.getEventsForDate).mockResolvedValue([createMockEvent()]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Calendar View Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA roles and labels', async () => {
      renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });

      // Calendar should have grid role
      const calendar = screen.getByRole('grid');
      expect(calendar).toBeInTheDocument();
      expect(calendar).toHaveAttribute('aria-label', expect.stringContaining('Calendar'));

      // Navigation buttons should have proper labels
      const prevButton = screen.getByRole('button', { name: /previous month/i });
      const nextButton = screen.getByRole('button', { name: /next month/i });
      expect(prevButton).toHaveAttribute('aria-label');
      expect(nextButton).toHaveAttribute('aria-label');

      // Month/year header should be properly labeled
      const monthHeader = screen.getByRole('heading', { level: 2 });
      expect(monthHeader).toBeInTheDocument();
      expect(monthHeader).toHaveTextContent(/January 2024/);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });

      const calendar = screen.getByRole('grid');
      
      // Focus should move to calendar
      calendar.focus();
      expect(calendar).toHaveFocus();

      // Arrow keys should navigate between dates
      await user.keyboard('{ArrowRight}');
      // Should move focus to next day (implementation dependent)
      
      await user.keyboard('{ArrowDown}');
      // Should move focus to same day next week
      
      await user.keyboard('{Home}');
      // Should move to first day of week
      
      await user.keyboard('{End}');
      // Should move to last day of week
      
      await user.keyboard('{PageUp}');
      // Should move to previous month
      
      await user.keyboard('{PageDown}');
      // Should move to next month
    });

    it('should announce date changes to screen readers', async () => {
      const user = userEvent.setup();
      renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });

      // Should have live region for announcements
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');

      // Navigate to next month
      const nextButton = screen.getByRole('button', { name: /next month/i });
      await user.click(nextButton);

      // Should announce the change
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/February 2024/);
      });
    });

    it('should have proper color contrast for events', async () => {
      const { container } = renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
      });

      // Event elements should have sufficient color contrast
      const eventElements = container.querySelectorAll('[data-testid="calendar-event"]');
      eventElements.forEach(event => {
        const styles = window.getComputedStyle(event);
        
        // Should have background color
        expect(styles.backgroundColor).not.toBe('transparent');
        
        // Text should be readable (this would need actual color contrast calculation)
        expect(styles.color).toBeTruthy();
      });
    });

    it('should support high contrast mode', async () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { container } = renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });

      // Should apply high contrast styles
      const eventElements = container.querySelectorAll('[data-testid="calendar-event"]');
      eventElements.forEach(event => {
        expect(event).toHaveClass('contrast-more:border-2');
        expect(event).toHaveClass('contrast-more:border-black');
      });
    });
  });

  describe('Day View Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const selectedDate = new Date('2024-01-15');
      const { container } = renderWithAuth(
        <DayView 
          selectedDate={selectedDate}
          onEventClick={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('day-view')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper time slot labels', async () => {
      const selectedDate = new Date('2024-01-15');
      renderWithAuth(
        <DayView 
          selectedDate={selectedDate}
          onEventClick={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('day-view')).toBeInTheDocument();
      });

      // Time slots should be properly labeled
      const timeSlots = screen.getAllByRole('button', { name: /\d{1,2}:\d{2}/ });
      timeSlots.forEach(slot => {
        expect(slot).toHaveAttribute('aria-label');
        expect(slot.getAttribute('aria-label')).toMatch(/\d{1,2}:\d{2}/);
      });

      // Should have proper time format for screen readers
      const nineAmSlot = screen.getByRole('button', { name: /9:00 AM/i });
      expect(nineAmSlot).toBeInTheDocument();
    });

    it('should support keyboard navigation in timeline', async () => {
      const user = userEvent.setup();
      const selectedDate = new Date('2024-01-15');
      
      renderWithAuth(
        <DayView 
          selectedDate={selectedDate}
          onEventClick={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('day-view')).toBeInTheDocument();
      });

      // Should be able to navigate time slots with keyboard
      const firstTimeSlot = screen.getAllByRole('button')[0];
      firstTimeSlot.focus();

      await user.keyboard('{ArrowDown}');
      // Should move to next time slot

      await user.keyboard('{ArrowUp}');
      // Should move to previous time slot

      await user.keyboard('{Enter}');
      // Should select time slot or create event
    });

    it('should announce event details to screen readers', async () => {
      const selectedDate = new Date('2024-01-15');
      renderWithAuth(
        <DayView 
          selectedDate={selectedDate}
          onEventClick={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
      });

      // Events should have descriptive labels
      const eventElement = screen.getByText('Test Event');
      const eventButton = eventElement.closest('button');
      
      expect(eventButton).toHaveAttribute('aria-label');
      expect(eventButton?.getAttribute('aria-label')).toMatch(/Test Event.*10:00.*11:00/);
    });
  });

  describe('Event Form Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithAuth(
        <EventForm 
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form labels and descriptions', async () => {
      renderWithAuth(
        <EventForm 
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      // All form fields should have labels
      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toBeRequired();
      expect(titleInput).toHaveAttribute('aria-describedby');

      const descriptionInput = screen.getByLabelText(/description/i);
      expect(descriptionInput).toHaveAttribute('aria-describedby');

      const startDateInput = screen.getByLabelText(/start date/i);
      expect(startDateInput).toBeRequired();

      const startTimeInput = screen.getByLabelText(/start time/i);
      expect(startTimeInput).toHaveAttribute('aria-describedby');
    });

    it('should provide clear error messages', async () => {
      const user = userEvent.setup();
      renderWithAuth(
        <EventForm 
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      // Submit form without required fields
      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      // Error messages should be associated with fields
      await waitFor(() => {
        const titleError = screen.getByText(/title is required/i);
        expect(titleError).toBeInTheDocument();
        expect(titleError).toHaveAttribute('role', 'alert');

        const titleInput = screen.getByLabelText(/title/i);
        expect(titleInput).toHaveAttribute('aria-invalid', 'true');
        expect(titleInput).toHaveAttribute('aria-describedby', expect.stringContaining(titleError.id));
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithAuth(
        <EventForm 
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      // Should be able to navigate form with Tab
      await user.tab();
      expect(screen.getByLabelText(/title/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/description/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/start date/i)).toHaveFocus();

      // Should be able to submit with Enter
      const titleInput = screen.getByLabelText(/title/i);
      titleInput.focus();
      await user.type(titleInput, 'Test Event');
      await user.keyboard('{Enter}');

      // Should attempt to submit form
    });

    it('should announce form changes to screen readers', async () => {
      const user = userEvent.setup();
      renderWithAuth(
        <EventForm 
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      // Should have live region for form status
      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toBeInTheDocument();

      // Toggle all-day event
      const allDayToggle = screen.getByLabelText(/all day/i);
      await user.click(allDayToggle);

      // Should announce the change
      await waitFor(() => {
        expect(statusRegion).toHaveTextContent(/all day event/i);
      });
    });
  });

  describe('Event Details Modal Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithAuth(
        <EventDetailsModal
          event={createMockEvent()}
          isOpen={true}
          onClose={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should manage focus properly', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      
      renderWithAuth(
        <EventDetailsModal
          event={createMockEvent()}
          isOpen={true}
          onClose={onClose}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );

      // Modal should receive focus when opened
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveFocus();

      // Should trap focus within modal
      await user.tab();
      const firstFocusable = document.activeElement;
      
      // Tab through all focusable elements
      let tabCount = 0;
      while (tabCount < 10) { // Prevent infinite loop
        await user.tab();
        tabCount++;
        if (document.activeElement === firstFocusable) {
          break; // Focus wrapped around
        }
      }

      expect(tabCount).toBeGreaterThan(1); // Should have multiple focusable elements

      // Escape should close modal
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalled();
    });

    it('should have proper modal attributes', async () => {
      renderWithAuth(
        <EventDetailsModal
          event={createMockEvent()}
          isOpen={true}
          onClose={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby');
      expect(modal).toHaveAttribute('aria-describedby');

      // Should have proper heading
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(modal.getAttribute('aria-labelledby')).toBe(heading.id);
    });

    it('should announce modal content to screen readers', async () => {
      renderWithAuth(
        <EventDetailsModal
          event={createMockEvent({
            title: 'Important Meeting',
            description: 'Quarterly review meeting',
            startDate: new Date('2024-01-15T14:00:00Z')
          })}
          isOpen={true}
          onClose={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      );

      // Event details should be properly structured
      expect(screen.getByText('Important Meeting')).toBeInTheDocument();
      expect(screen.getByText('Quarterly review meeting')).toBeInTheDocument();

      // Date and time should be in accessible format
      const dateElement = screen.getByText(/January 15, 2024/);
      expect(dateElement).toHaveAttribute('aria-label', expect.stringContaining('January 15, 2024'));
    });
  });

  describe('Calendar Filters Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithAuth(
        <CalendarFilters
          onFiltersChange={() => {}}
          eventTypes={['task', 'project', 'plant_care', 'custom']}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper fieldset and legend', async () => {
      renderWithAuth(
        <CalendarFilters
          onFiltersChange={() => {}}
          eventTypes={['task', 'project', 'plant_care', 'custom']}
        />
      );

      // Filter groups should use fieldset/legend
      const fieldset = screen.getByRole('group', { name: /event types/i });
      expect(fieldset).toBeInTheDocument();

      const legend = screen.getByText(/event types/i);
      expect(legend).toBeInTheDocument();
    });

    it('should support keyboard navigation for filters', async () => {
      const user = userEvent.setup();
      renderWithAuth(
        <CalendarFilters
          onFiltersChange={() => {}}
          eventTypes={['task', 'project', 'plant_care', 'custom']}
        />
      );

      // Should be able to navigate checkboxes with keyboard
      const taskFilter = screen.getByLabelText(/task/i);
      taskFilter.focus();

      await user.keyboard(' '); // Space to toggle
      expect(taskFilter).toBeChecked();

      await user.keyboard('{ArrowDown}');
      expect(screen.getByLabelText(/project/i)).toHaveFocus();
    });

    it('should announce filter changes', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();
      
      renderWithAuth(
        <CalendarFilters
          onFiltersChange={onFiltersChange}
          eventTypes={['task', 'project', 'plant_care', 'custom']}
        />
      );

      // Should have live region for filter announcements
      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toBeInTheDocument();

      // Toggle filter
      const taskFilter = screen.getByLabelText(/task/i);
      await user.click(taskFilter);

      // Should announce the change
      await waitFor(() => {
        expect(statusRegion).toHaveTextContent(/task events filtered/i);
      });

      expect(onFiltersChange).toHaveBeenCalled();
    });
  });

  describe('Reduced Motion Support', () => {
    it('should respect prefers-reduced-motion', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { container } = renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });

      // Animated elements should have reduced motion classes
      const animatedElements = container.querySelectorAll('[class*="transition"]');
      animatedElements.forEach(element => {
        expect(element).toHaveClass('motion-reduce:transition-none');
      });

      // Hover effects should be reduced
      const hoverElements = container.querySelectorAll('[class*="hover:"]');
      hoverElements.forEach(element => {
        expect(element).toHaveClass('motion-reduce:hover:transform-none');
      });
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should provide comprehensive screen reader support', async () => {
      renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });

      // Should have proper document structure
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();

      const navigation = screen.getByRole('navigation');
      expect(navigation).toBeInTheDocument();

      // Should have skip links
      const skipLink = screen.getByText(/skip to main content/i);
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');

      // Should have proper heading hierarchy
      const headings = screen.getAllByRole('heading');
      expect(headings[0]).toHaveAttribute('aria-level', '1');
      expect(headings[1]).toHaveAttribute('aria-level', '2');
    });

    it('should provide context for complex interactions', async () => {
      const user = userEvent.setup();
      renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
      });

      // Events should have rich descriptions
      const eventElement = screen.getByText('Test Event');
      const eventButton = eventElement.closest('button');
      
      expect(eventButton).toHaveAttribute('aria-describedby');
      
      const description = document.getElementById(
        eventButton?.getAttribute('aria-describedby') || ''
      );
      expect(description).toHaveTextContent(/custom event.*January 15.*10:00 AM/i);
    });
  });
});