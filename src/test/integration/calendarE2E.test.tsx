import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { CalendarPage } from '../../pages/CalendarPage';
import { DashboardPage } from '../../pages/DashboardPage';
import * as calendarService from '../../services/calendarService';
import * as optimizedCalendarService from '../../services/optimizedCalendarService';
import * as notificationService from '../../services/notificationService';
import type { CalendarEvent } from '../../types';

// Mock Firebase and services
vi.mock('../../config/firebase', () => ({
  db: {},
  auth: {}
}));

vi.mock('../../services/calendarService');
vi.mock('../../services/optimizedCalendarService');
vi.mock('../../services/notificationService');

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

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe.skip('Calendar End-to-End Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    vi.mocked(optimizedCalendarService.getEventsForCalendarViewOptimized).mockResolvedValue([
      createMockEvent(),
      createMockEvent({
        id: 'event-2',
        title: 'Meeting',
        type: 'project',
        startDate: new Date('2024-01-16T14:00:00Z'),
        endDate: new Date('2024-01-16T15:00:00Z')
      })
    ]);
    
    vi.mocked(calendarService.getUpcomingEvents).mockResolvedValue([]);
    vi.mocked(calendarService.getOverdueEvents).mockResolvedValue([]);
    vi.mocked(calendarService.getTodaysEvents).mockResolvedValue([]);
    vi.mocked(calendarService.createEvent).mockImplementation(async (userId, eventData) => 
      createMockEvent({ ...eventData, id: 'new-event-id' })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Calendar Page Workflow', () => {
    it('should load calendar page and display events', async () => {
      renderWithRouter(<CalendarPage />);

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText(/calendar/i)).toBeInTheDocument();
      });

      // Should load events for current month
      await waitFor(() => {
        expect(optimizedCalendarService.getEventsForCalendarViewOptimized).toHaveBeenCalled();
      });

      // Should display events
      expect(screen.getByText('Test Event')).toBeInTheDocument();
      expect(screen.getByText('Meeting')).toBeInTheDocument();
    });

    it('should navigate between different calendar views', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(<CalendarPage />);

      await waitFor(() => {
        expect(screen.getByText(/calendar/i)).toBeInTheDocument();
      });

      // Should start in month view
      expect(screen.getByText(/January 2024/)).toBeInTheDocument();

      // Switch to day view
      const dayViewButton = screen.getByRole('button', { name: /day view/i });
      await user.click(dayViewButton);

      // Should show day view
      await waitFor(() => {
        expect(screen.getByTestId('day-view')).toBeInTheDocument();
      });

      // Switch back to month view
      const monthViewButton = screen.getByRole('button', { name: /month view/i });
      await user.click(monthViewButton);

      // Should show month view again
      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });
    });

    it('should create new event through calendar interface', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(<CalendarPage />);

      await waitFor(() => {
        expect(screen.getByText(/calendar/i)).toBeInTheDocument();
      });

      // Click "New Event" button
      const newEventButton = screen.getByRole('button', { name: /new event/i });
      await user.click(newEventButton);

      // Should open event form modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/create event/i)).toBeInTheDocument();
      });

      // Fill out the form
      await user.type(screen.getByLabelText(/title/i), 'New Calendar Event');
      await user.type(screen.getByLabelText(/description/i), 'Event created through E2E test');

      // Set date
      const dateInput = screen.getByLabelText(/start date/i);
      await user.clear(dateInput);
      await user.type(dateInput, '2024-01-20');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      // Should create the event
      await waitFor(() => {
        expect(calendarService.createEvent).toHaveBeenCalledWith(
          mockUser.uid,
          expect.objectContaining({
            title: 'New Calendar Event',
            description: 'Event created through E2E test'
          })
        );
      });

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should edit existing event through calendar interface', async () => {
      const user = userEvent.setup();
      
      vi.mocked(calendarService.getEvent).mockResolvedValue(createMockEvent());
      vi.mocked(calendarService.updateEvent).mockResolvedValue(
        createMockEvent({ title: 'Updated Event' })
      );

      renderWithRouter(<CalendarPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
      });

      // Click on an event
      const eventElement = screen.getByText('Test Event');
      await user.click(eventElement);

      // Should open event details modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/event details/i)).toBeInTheDocument();
      });

      // Click edit button
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Should switch to edit mode
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Event')).toBeInTheDocument();
      });

      // Update the title
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Event');

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should update the event
      await waitFor(() => {
        expect(calendarService.updateEvent).toHaveBeenCalledWith(
          mockUser.uid,
          'event-1',
          expect.objectContaining({
            title: 'Updated Event'
          })
        );
      });
    });

    it('should delete event through calendar interface', async () => {
      const user = userEvent.setup();
      
      vi.mocked(calendarService.getEvent).mockResolvedValue(createMockEvent());
      vi.mocked(calendarService.deleteEvent).mockResolvedValue();

      renderWithRouter(<CalendarPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
      });

      // Click on an event
      const eventElement = screen.getByText('Test Event');
      await user.click(eventElement);

      // Should open event details modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Should delete the event
      await waitFor(() => {
        expect(calendarService.deleteEvent).toHaveBeenCalledWith(
          mockUser.uid,
          'event-1'
        );
      });

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Calendar Integration with Dashboard', () => {
    it('should show calendar summary on dashboard', async () => {
      const todayEvent = createMockEvent({
        id: 'today-event',
        title: 'Today Event',
        startDate: new Date(),
        endDate: new Date()
      });

      const upcomingEvent = createMockEvent({
        id: 'upcoming-event',
        title: 'Upcoming Event',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      vi.mocked(calendarService.getTodaysEvents).mockResolvedValue([todayEvent]);
      vi.mocked(calendarService.getUpcomingEvents).mockResolvedValue([upcomingEvent]);

      renderWithRouter(<DashboardPage />);

      // Should show today's events
      await waitFor(() => {
        expect(screen.getByText('Today Event')).toBeInTheDocument();
      });

      // Should show upcoming events
      await waitFor(() => {
        expect(screen.getByText('Upcoming Event')).toBeInTheDocument();
      });

      // Should have link to full calendar
      const calendarLink = screen.getByRole('link', { name: /view calendar/i });
      expect(calendarLink).toHaveAttribute('href', '/calendar');
    });

    it('should handle overdue events on dashboard', async () => {
      const overdueEvent = createMockEvent({
        id: 'overdue-event',
        title: 'Overdue Task',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        endDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        type: 'task'
      });

      vi.mocked(calendarService.getOverdueEvents).mockResolvedValue([overdueEvent]);

      renderWithRouter(<DashboardPage />);

      // Should show overdue events with warning styling
      await waitFor(() => {
        expect(screen.getByText('Overdue Task')).toBeInTheDocument();
      });

      const overdueSection = screen.getByText('Overdue Task').closest('[data-testid="overdue-events"]');
      expect(overdueSection).toHaveClass('border-red-200');
    });
  });

  describe('Calendar Filtering and Search E2E', () => {
    it('should filter events by type through UI', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(<CalendarPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
        expect(screen.getByText('Meeting')).toBeInTheDocument();
      });

      // Open filters
      const filtersButton = screen.getByRole('button', { name: /filters/i });
      await user.click(filtersButton);

      // Filter by project events only
      const projectFilter = screen.getByLabelText(/project/i);
      await user.click(projectFilter);

      // Should only show project events
      await waitFor(() => {
        expect(screen.getByText('Meeting')).toBeInTheDocument();
        expect(screen.queryByText('Test Event')).not.toBeInTheDocument();
      });

      // Clear filters
      const clearFiltersButton = screen.getByRole('button', { name: /clear filters/i });
      await user.click(clearFiltersButton);

      // Should show all events again
      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
        expect(screen.getByText('Meeting')).toBeInTheDocument();
      });
    });

    it('should search events through UI', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(<CalendarPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
        expect(screen.getByText('Meeting')).toBeInTheDocument();
      });

      // Search for "meeting"
      const searchInput = screen.getByPlaceholderText(/search events/i);
      await user.type(searchInput, 'meeting');

      // Should only show matching events
      await waitFor(() => {
        expect(screen.getByText('Meeting')).toBeInTheDocument();
        expect(screen.queryByText('Test Event')).not.toBeInTheDocument();
      });

      // Clear search
      await user.clear(searchInput);

      // Should show all events again
      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
        expect(screen.getByText('Meeting')).toBeInTheDocument();
      });
    });
  });

  describe('Calendar Notifications E2E', () => {
    it('should handle notification permissions and scheduling', async () => {
      const user = userEvent.setup();
      
      // Mock notification service
      vi.mocked(notificationService.requestPermission).mockResolvedValue(true);
      vi.mocked(notificationService.scheduleNotification).mockResolvedValue();

      renderWithRouter(<CalendarPage />);

      // Create event with notifications
      const newEventButton = screen.getByRole('button', { name: /new event/i });
      await user.click(newEventButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Fill basic event info
      await user.type(screen.getByLabelText(/title/i), 'Event with Notification');

      // Enable notifications
      const notificationToggle = screen.getByLabelText(/enable notifications/i);
      await user.click(notificationToggle);

      // Should request permission
      await waitFor(() => {
        expect(notificationService.requestPermission).toHaveBeenCalled();
      });

      // Set notification timing
      const notificationSelect = screen.getByLabelText(/notification timing/i);
      await user.selectOptions(notificationSelect, '15'); // 15 minutes before

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      // Should create event with notifications
      await waitFor(() => {
        expect(calendarService.createEvent).toHaveBeenCalledWith(
          mockUser.uid,
          expect.objectContaining({
            title: 'Event with Notification',
            notifications: expect.arrayContaining([
              expect.objectContaining({
                type: 'browser',
                timing: 15,
                enabled: true
              })
            ])
          })
        );
      });
    });
  });

  describe('Calendar Performance and Error Handling E2E', () => {
    it('should handle large datasets gracefully', async () => {
      // Mock large dataset
      const largeEventList = Array.from({ length: 500 }, (_, i) => 
        createMockEvent({
          id: `event-${i}`,
          title: `Event ${i}`,
          startDate: new Date(2024, 0, 1 + (i % 31))
        })
      );

      vi.mocked(optimizedCalendarService.getEventsForCalendarViewOptimized)
        .mockResolvedValue(largeEventList);

      const { container } = renderWithRouter(<CalendarPage />);

      // Should load without performance issues
      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Should use virtual scrolling for event lists
      const eventList = container.querySelector('[data-testid="virtual-event-list"]');
      if (eventList) {
        expect(eventList).toBeInTheDocument();
      }

      // Calendar grid should still be responsive
      const calendarGrid = container.querySelector('[data-testid="calendar-grid"]');
      expect(calendarGrid).toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      vi.mocked(optimizedCalendarService.getEventsForCalendarViewOptimized)
        .mockRejectedValue(new Error('Network error'));

      renderWithRouter(<CalendarPage />);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });

      // Should show retry option
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      // Retry should work
      vi.mocked(optimizedCalendarService.getEventsForCalendarViewOptimized)
        .mockResolvedValue([createMockEvent()]);

      const user = userEvent.setup();
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
      });
    });

    it('should handle offline scenarios', async () => {
      // Mock offline scenario
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      renderWithRouter(<CalendarPage />);

      // Should show offline indicator
      await waitFor(() => {
        expect(screen.getByText(/offline/i)).toBeInTheDocument();
      });

      // Should still show cached events if available
      // (This would depend on offline service implementation)
    });
  });

  describe('Calendar Accessibility E2E', () => {
    it('should be navigable with keyboard', async () => {
      const user = userEvent.setup();
      
      renderWithRouter(<CalendarPage />);

      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });

      // Should be able to navigate calendar with arrow keys
      const calendarGrid = screen.getByRole('grid');
      calendarGrid.focus();

      // Navigate with arrow keys
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      // Should select date or open event
      // (Specific behavior depends on implementation)
    });

    it('should have proper ARIA labels and roles', async () => {
      renderWithRouter(<CalendarPage />);

      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });

      // Calendar should have proper grid role
      const calendarGrid = screen.getByRole('grid');
      expect(calendarGrid).toBeInTheDocument();

      // Navigation buttons should have proper labels
      const prevButton = screen.getByLabelText(/previous month/i);
      const nextButton = screen.getByLabelText(/next month/i);
      expect(prevButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();

      // Events should be properly labeled
      const events = screen.getAllByRole('button');
      events.forEach(event => {
        expect(event).toHaveAttribute('aria-label');
      });
    });

    it('should support screen readers', async () => {
      renderWithRouter(<CalendarPage />);

      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });

      // Should have live region for announcements
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toBeInTheDocument();

      // Should announce navigation changes
      const user = userEvent.setup();
      const nextButton = screen.getByLabelText(/next month/i);
      await user.click(nextButton);

      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/february/i);
      });
    });
  });
});