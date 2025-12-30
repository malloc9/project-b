import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarView } from '../../components/calendar/CalendarView';
import { EventForm } from '../../components/calendar/EventForm';
import { EventDetailsModal } from '../../components/calendar/EventDetailsModal';
import { DayView } from '../../components/calendar/DayView';
import { CalendarFilters } from '../../components/calendar/CalendarFilters';
import { VirtualEventList } from '../../components/calendar/VirtualEventList';
import * as calendarService from '../../services/calendarService';
import * as optimizedCalendarService from '../../services/optimizedCalendarService';
import type { CalendarEvent, CreateCalendarEventData } from '../../types';

// Mock Firebase
vi.mock('../../config/firebase', () => ({
  db: {},
  auth: {}
}));

// Mock services
vi.mock('../../services/calendarService');
vi.mock('../../services/optimizedCalendarService');

// Mock auth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User'
    },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn()
  })
}));

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

const mockCalendarEvent: CalendarEvent = {
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
  updatedAt: new Date('2024-01-01T00:00:00Z')
};

const mockRecurringEvent: CalendarEvent = {
  ...mockCalendarEvent,
  id: 'recurring-event-1',
  title: 'Weekly Meeting',
  recurrence: {
    type: 'weekly',
    interval: 1,
    seriesId: 'series-123'
  }
};

const mockTaskEvent: CalendarEvent = {
  ...mockCalendarEvent,
  id: 'task-event-1',
  title: 'Complete Project',
  type: 'task',
  sourceId: 'task-123',
  allDay: true
};

const renderWithAuth = (component: React.ReactElement) => {
  return render(component);
};

describe('Calendar Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    vi.mocked(optimizedCalendarService.getEventsForCalendarViewOptimized).mockResolvedValue([
      mockCalendarEvent,
      mockRecurringEvent,
      mockTaskEvent
    ]);
    
    vi.mocked(calendarService.createEvent).mockResolvedValue(mockCalendarEvent);
    vi.mocked(calendarService.updateEvent).mockResolvedValue(mockCalendarEvent);
    vi.mocked(calendarService.deleteEvent).mockResolvedValue();
    vi.mocked(calendarService.getEvent).mockResolvedValue(mockCalendarEvent);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Calendar Navigation Workflow', () => {
    it('should navigate between months and load events correctly', async () => {
      const user = userEvent.setup();
      
      renderWithAuth(<CalendarView />);

      // Wait for initial load
      await waitFor(() => {
        expect(optimizedCalendarService.getEventsForCalendarViewOptimized).toHaveBeenCalled();
      });

      // Check that current month is displayed
      expect(screen.getByText(/January 2024/)).toBeInTheDocument();

      // Navigate to next month
      const nextButton = screen.getByLabelText('Next month');
      await user.click(nextButton);

      // Verify navigation
      await waitFor(() => {
        expect(screen.getByText(/February 2024/)).toBeInTheDocument();
      });

      // Navigate to previous month
      const prevButton = screen.getByLabelText('Previous month');
      await user.click(prevButton);

      // Verify we're back to January
      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });

      // Verify events are loaded for each navigation
      expect(optimizedCalendarService.getEventsForCalendarViewOptimized).toHaveBeenCalledTimes(3);
    });

    it('should display events correctly on calendar grid', async () => {
      renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
        expect(screen.getByText('Weekly Meeting')).toBeInTheDocument();
        expect(screen.getByText('Complete Project')).toBeInTheDocument();
      });

      // Check event type colors are applied
      const testEvent = screen.getByText('Test Event');
      expect(testEvent).toHaveClass('bg-purple-500'); // custom event color

      const taskEvent = screen.getByText('Complete Project');
      expect(taskEvent).toHaveClass('bg-blue-500'); // task event color
    });
  });

  describe('Event Creation and Editing Workflow', () => {
    it('should create a new event through the form', async () => {
      const user = userEvent.setup();
      const onEventCreated = vi.fn();

      renderWithAuth(
        <EventForm 
          onSubmit={onEventCreated}
          onCancel={() => {}}
        />
      );

      // Fill out the form
      await user.type(screen.getByLabelText(/title/i), 'New Test Event');
      await user.type(screen.getByLabelText(/description/i), 'Event description');
      
      // Set date and time
      const startDateInput = screen.getByLabelText(/start date/i);
      await user.clear(startDateInput);
      await user.type(startDateInput, '2024-01-20');

      const startTimeInput = screen.getByLabelText(/start time/i);
      await user.clear(startTimeInput);
      await user.type(startTimeInput, '14:00');

      const endTimeInput = screen.getByLabelText(/end time/i);
      await user.clear(endTimeInput);
      await user.type(endTimeInput, '15:00');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      // Verify the event was created
      await waitFor(() => {
        expect(calendarService.createEvent).toHaveBeenCalledWith(
          mockUser.uid,
          expect.objectContaining({
            title: 'New Test Event',
            description: 'Event description',
            type: 'custom',
            status: 'pending'
          })
        );
      });

      expect(onEventCreated).toHaveBeenCalled();
    });

    it('should edit an existing event', async () => {
      const user = userEvent.setup();
      const onEventUpdated = vi.fn();

      renderWithAuth(
        <EventForm 
          event={mockCalendarEvent}
          onSubmit={onEventUpdated}
          onCancel={() => {}}
        />
      );

      // Verify form is pre-filled
      expect(screen.getByDisplayValue('Test Event')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test event description')).toBeInTheDocument();

      // Update the title
      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Test Event');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /update event/i });
      await user.click(submitButton);

      // Verify the event was updated
      await waitFor(() => {
        expect(calendarService.updateEvent).toHaveBeenCalledWith(
          mockUser.uid,
          mockCalendarEvent.id,
          expect.objectContaining({
            title: 'Updated Test Event'
          })
        );
      });

      expect(onEventUpdated).toHaveBeenCalled();
    });

    it('should validate form inputs correctly', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      renderWithAuth(
        <EventForm 
          onSubmit={onSubmit}
          onCancel={() => {}}
        />
      );

      // Try to submit without title
      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Event Details and Actions Workflow', () => {
    it('should display event details in modal', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();

      renderWithAuth(
        <EventDetailsModal
          event={mockCalendarEvent}
          isOpen={true}
          onClose={onClose}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      // Verify event details are displayed
      expect(screen.getByText('Test Event')).toBeInTheDocument();
      expect(screen.getByText('Test event description')).toBeInTheDocument();
      expect(screen.getByText(/January 15, 2024/)).toBeInTheDocument();

      // Test edit action
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);
      expect(onEdit).toHaveBeenCalledWith(mockCalendarEvent);

      // Test delete action
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Should show confirmation dialog
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(calendarService.deleteEvent).toHaveBeenCalledWith(
          mockUser.uid,
          mockCalendarEvent.id
        );
      });

      expect(onDelete).toHaveBeenCalledWith(mockCalendarEvent);
    });

    it('should handle recurring event actions', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();

      renderWithAuth(
        <EventDetailsModal
          event={mockRecurringEvent}
          isOpen={true}
          onClose={() => {}}
          onEdit={onEdit}
          onDelete={() => {}}
        />
      );

      // Should show recurring event indicator
      expect(screen.getByText(/recurring/i)).toBeInTheDocument();

      // Edit button should show options for recurring events
      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      // Should show options for editing single vs series
      expect(screen.getByText(/edit this event only/i)).toBeInTheDocument();
      expect(screen.getByText(/edit entire series/i)).toBeInTheDocument();
    });
  });

  describe('Day View Workflow', () => {
    it('should display events in timeline format', async () => {
      const selectedDate = new Date('2024-01-15');
      
      vi.mocked(calendarService.getEventsForDate).mockResolvedValue([
        mockCalendarEvent,
        {
          ...mockCalendarEvent,
          id: 'event-2',
          title: 'Afternoon Meeting',
          startDate: new Date('2024-01-15T14:00:00Z'),
          endDate: new Date('2024-01-15T15:00:00Z')
        }
      ]);

      renderWithAuth(
        <DayView 
          selectedDate={selectedDate}
          onEventClick={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
        expect(screen.getByText('Afternoon Meeting')).toBeInTheDocument();
      });

      // Events should be positioned based on time
      const testEvent = screen.getByText('Test Event').closest('[data-testid="day-event"]');
      const afternoonEvent = screen.getByText('Afternoon Meeting').closest('[data-testid="day-event"]');

      expect(testEvent).toHaveStyle({ top: expect.stringContaining('px') });
      expect(afternoonEvent).toHaveStyle({ top: expect.stringContaining('px') });
    });

    it('should allow quick event creation from day view', async () => {
      const user = userEvent.setup();
      const selectedDate = new Date('2024-01-15');

      renderWithAuth(
        <DayView 
          selectedDate={selectedDate}
          onEventClick={() => {}}
        />
      );

      // Click on a time slot to create event
      const timeSlot = screen.getByTestId('time-slot-10:00');
      await user.click(timeSlot);

      // Should show quick create form
      expect(screen.getByPlaceholderText(/event title/i)).toBeInTheDocument();

      // Create event
      await user.type(screen.getByPlaceholderText(/event title/i), 'Quick Event');
      await user.press('Enter');

      await waitFor(() => {
        expect(calendarService.createEvent).toHaveBeenCalledWith(
          mockUser.uid,
          expect.objectContaining({
            title: 'Quick Event',
            startDate: expect.any(Date),
            endDate: expect.any(Date)
          })
        );
      });
    });
  });

  describe('Calendar Filtering and Search Workflow', () => {
    it('should filter events by type', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();

      renderWithAuth(
        <CalendarFilters
          onFiltersChange={onFiltersChange}
          eventTypes={['task', 'project', 'plant_care', 'custom']}
        />
      );

      // Filter by task events only
      const taskFilter = screen.getByLabelText(/task/i);
      await user.click(taskFilter);

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          types: ['task']
        })
      );

      // Add project events to filter
      const projectFilter = screen.getByLabelText(/project/i);
      await user.click(projectFilter);

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          types: ['task', 'project']
        })
      );
    });

    it('should search events by title and description', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();

      renderWithAuth(
        <CalendarFilters
          onFiltersChange={onFiltersChange}
          eventTypes={['task', 'project', 'plant_care', 'custom']}
        />
      );

      // Search for events
      const searchInput = screen.getByPlaceholderText(/search events/i);
      await user.type(searchInput, 'meeting');

      // Should debounce and call filter change
      await waitFor(() => {
        expect(onFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            searchTerm: 'meeting'
          })
        );
      }, { timeout: 1000 });
    });

    it('should filter events by date range', async () => {
      const user = userEvent.setup();
      const onFiltersChange = vi.fn();

      renderWithAuth(
        <CalendarFilters
          onFiltersChange={onFiltersChange}
          eventTypes={['task', 'project', 'plant_care', 'custom']}
        />
      );

      // Set date range
      const startDateInput = screen.getByLabelText(/start date/i);
      await user.type(startDateInput, '2024-01-01');

      const endDateInput = screen.getByLabelText(/end date/i);
      await user.type(endDateInput, '2024-01-31');

      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date)
        })
      );
    });
  });

  describe('Virtual Event List Performance', () => {
    it('should handle large event lists efficiently', async () => {
      const largeEventList: CalendarEvent[] = Array.from({ length: 1000 }, (_, i) => ({
        ...mockCalendarEvent,
        id: `event-${i}`,
        title: `Event ${i}`,
        startDate: new Date(2024, 0, 1 + (i % 31))
      }));

      const onEventClick = vi.fn();

      const { container } = renderWithAuth(
        <VirtualEventList
          events={largeEventList}
          itemHeight={120}
          containerHeight={400}
          onEventClick={onEventClick}
        />
      );

      // Should only render visible items (not all 1000)
      const renderedEvents = container.querySelectorAll('[data-testid="virtual-event-item"]');
      expect(renderedEvents.length).toBeLessThan(20); // Only visible items

      // Should still be able to scroll and interact
      const scrollContainer = container.querySelector('[data-testid="virtual-scroll-container"]');
      expect(scrollContainer).toBeInTheDocument();

      // Verify total height is calculated correctly
      expect(scrollContainer).toHaveStyle({ height: '120000px' }); // 1000 * 120px
    });

    it('should update visible items when scrolling', async () => {
      const user = userEvent.setup();
      const largeEventList: CalendarEvent[] = Array.from({ length: 100 }, (_, i) => ({
        ...mockCalendarEvent,
        id: `event-${i}`,
        title: `Event ${i}`
      }));

      const { container } = renderWithAuth(
        <VirtualEventList
          events={largeEventList}
          itemHeight={120}
          containerHeight={400}
          onEventClick={() => {}}
        />
      );

      const scrollContainer = container.querySelector('[data-testid="virtual-scroll-container"]');
      
      // Scroll down
      fireEvent.scroll(scrollContainer!, { target: { scrollTop: 1200 } });

      // Should render different items after scroll
      await waitFor(() => {
        expect(screen.getByText('Event 10')).toBeInTheDocument();
      });

      // Earlier events should not be rendered
      expect(screen.queryByText('Event 0')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      vi.mocked(optimizedCalendarService.getEventsForCalendarViewOptimized)
        .mockRejectedValue(new Error('Network error'));

      renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load calendar events/i)).toBeInTheDocument();
      });

      // Should show retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should handle empty event lists', async () => {
      vi.mocked(optimizedCalendarService.getEventsForCalendarViewOptimized)
        .mockResolvedValue([]);

      renderWithAuth(<CalendarView />);

      await waitFor(() => {
        // Calendar should still render without events
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });

      // Should not show any event indicators
      expect(screen.queryByText('Test Event')).not.toBeInTheDocument();
    });

    it('should validate date inputs in forms', async () => {
      const user = userEvent.setup();

      renderWithAuth(
        <EventForm 
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      // Set invalid date range (end before start)
      const startDateInput = screen.getByLabelText(/start date/i);
      await user.type(startDateInput, '2024-01-20');

      const endDateInput = screen.getByLabelText(/end date/i);
      await user.type(endDateInput, '2024-01-19');

      const submitButton = screen.getByRole('button', { name: /create event/i });
      await user.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
      });
    });
  });
});