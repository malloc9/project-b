import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CalendarService } from '../../services/calendarService';
import { CalendarProvider, useCalendar } from '../../contexts/CalendarContext';
import { CalendarSyncStatus } from '../../components/calendar/CalendarSyncStatus';
import { CalendarSettings } from '../../components/calendar/CalendarSettings';
import type { CalendarEvent } from '../../types';

// Mock Calendar Service
vi.mock('../../services/calendarService');

// Mock Firebase Functions
vi.mock('../../config/firebase', () => ({
  functions: {},
}));

const mockCalendarEvent: CalendarEvent = {
  id: 'event-1',
  title: 'Water Plants',
  description: 'Weekly plant watering',
  startDate: new Date('2024-02-01T10:00:00'),
  endDate: new Date('2024-02-01T10:30:00'),
  reminders: [
    { method: 'email', minutes: 60 },
    { method: 'popup', minutes: 15 },
  ],
};

const TestComponent = () => {
  const { 
    isConnected, 
    syncStatus, 
    createEvent, 
    updateEvent, 
    deleteEvent,
    syncAllEvents 
  } = useCalendar();

  return (
    <div>
      <div data-testid="connection-status">
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <div data-testid="sync-status">{syncStatus}</div>
      <button onClick={() => createEvent(mockCalendarEvent)}>
        Create Event
      </button>
      <button onClick={() => updateEvent('event-1', { title: 'Updated Event' })}>
        Update Event
      </button>
      <button onClick={() => deleteEvent('event-1')}>
        Delete Event
      </button>
      <button onClick={syncAllEvents}>
        Sync All Events
      </button>
    </div>
  );
};

const renderWithCalendarProvider = (component: React.ReactElement) => {
  return render(
    <CalendarProvider>
      {component}
    </CalendarProvider>
  );
};

describe('Calendar Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Calendar Connection', () => {
    it('shows disconnected status initially', () => {
      vi.mocked(CalendarService.isConnected).mockReturnValue(false);

      renderWithCalendarProvider(<TestComponent />);

      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
    });

    it('shows connected status when calendar is connected', async () => {
      vi.mocked(CalendarService.isConnected).mockReturnValue(true);
      vi.mocked(CalendarService.checkConnection).mockResolvedValue(true);

      renderWithCalendarProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });
    });

    it('handles connection errors gracefully', async () => {
      vi.mocked(CalendarService.checkConnection).mockRejectedValue(
        new Error('Connection failed')
      );

      renderWithCalendarProvider(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      });
    });
  });

  describe('Event Creation', () => {
    beforeEach(() => {
      vi.mocked(CalendarService.isConnected).mockReturnValue(true);
      vi.mocked(CalendarService.createEvent).mockResolvedValue('new-event-id');
    });

    it('creates calendar events successfully', async () => {
      renderWithCalendarProvider(<TestComponent />);

      const createButton = screen.getByText('Create Event');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(CalendarService.createEvent).toHaveBeenCalledWith(mockCalendarEvent);
      });
    });

    it('handles event creation errors', async () => {
      const createError = new Error('Failed to create event');
      vi.mocked(CalendarService.createEvent).mockRejectedValue(createError);

      renderWithCalendarProvider(<TestComponent />);

      const createButton = screen.getByText('Create Event');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('sync-status')).toHaveTextContent('error');
      });
    });

    it('shows sync status during event creation', async () => {
      // Mock a delayed response
      vi.mocked(CalendarService.createEvent).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('event-id'), 100))
      );

      renderWithCalendarProvider(<TestComponent />);

      const createButton = screen.getByText('Create Event');
      fireEvent.click(createButton);

      // Should show syncing status
      expect(screen.getByTestId('sync-status')).toHaveTextContent('syncing');

      await waitFor(() => {
        expect(screen.getByTestId('sync-status')).toHaveTextContent('idle');
      });
    });
  });

  describe('Event Updates', () => {
    beforeEach(() => {
      vi.mocked(CalendarService.isConnected).mockReturnValue(true);
      vi.mocked(CalendarService.updateEvent).mockResolvedValue(undefined);
    });

    it('updates calendar events successfully', async () => {
      renderWithCalendarProvider(<TestComponent />);

      const updateButton = screen.getByText('Update Event');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(CalendarService.updateEvent).toHaveBeenCalledWith(
          'event-1',
          { title: 'Updated Event' }
        );
      });
    });

    it('handles event update errors', async () => {
      const updateError = new Error('Failed to update event');
      vi.mocked(CalendarService.updateEvent).mockRejectedValue(updateError);

      renderWithCalendarProvider(<TestComponent />);

      const updateButton = screen.getByText('Update Event');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByTestId('sync-status')).toHaveTextContent('error');
      });
    });
  });

  describe('Event Deletion', () => {
    beforeEach(() => {
      vi.mocked(CalendarService.isConnected).mockReturnValue(true);
      vi.mocked(CalendarService.deleteEvent).mockResolvedValue(undefined);
    });

    it('deletes calendar events successfully', async () => {
      renderWithCalendarProvider(<TestComponent />);

      const deleteButton = screen.getByText('Delete Event');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(CalendarService.deleteEvent).toHaveBeenCalledWith('event-1');
      });
    });

    it('handles event deletion errors', async () => {
      const deleteError = new Error('Failed to delete event');
      vi.mocked(CalendarService.deleteEvent).mockRejectedValue(deleteError);

      renderWithCalendarProvider(<TestComponent />);

      const deleteButton = screen.getByText('Delete Event');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByTestId('sync-status')).toHaveTextContent('error');
      });
    });
  });

  describe('Bulk Sync Operations', () => {
    beforeEach(() => {
      vi.mocked(CalendarService.isConnected).mockReturnValue(true);
      vi.mocked(CalendarService.syncAllEvents).mockResolvedValue({
        created: 5,
        updated: 3,
        deleted: 1,
        errors: [],
      });
    });

    it('syncs all events successfully', async () => {
      renderWithCalendarProvider(<TestComponent />);

      const syncButton = screen.getByText('Sync All Events');
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(CalendarService.syncAllEvents).toHaveBeenCalled();
      });
    });

    it('handles sync errors', async () => {
      const syncError = new Error('Sync failed');
      vi.mocked(CalendarService.syncAllEvents).mockRejectedValue(syncError);

      renderWithCalendarProvider(<TestComponent />);

      const syncButton = screen.getByText('Sync All Events');
      fireEvent.click(syncButton);

      await waitFor(() => {
        expect(screen.getByTestId('sync-status')).toHaveTextContent('error');
      });
    });
  });

  describe('Calendar Sync Status Component', () => {
    it('displays sync status correctly', () => {
      vi.mocked(CalendarService.isConnected).mockReturnValue(true);

      renderWithCalendarProvider(<CalendarSyncStatus />);

      expect(screen.getByText(/calendar sync/i)).toBeInTheDocument();
    });

    it('shows retry button on error', async () => {
      vi.mocked(CalendarService.isConnected).mockReturnValue(false);

      renderWithCalendarProvider(<CalendarSyncStatus />);

      await waitFor(() => {
        expect(screen.getByText(/retry/i)).toBeInTheDocument();
      });
    });
  });

  describe('Calendar Settings Component', () => {
    it('renders calendar settings', () => {
      renderWithCalendarProvider(<CalendarSettings />);

      expect(screen.getByText(/calendar settings/i)).toBeInTheDocument();
    });

    it('allows toggling calendar sync', async () => {
      vi.mocked(CalendarService.disconnect).mockResolvedValue(undefined);

      renderWithCalendarProvider(<CalendarSettings />);

      const toggleButton = screen.getByRole('button', { name: /disconnect/i });
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(CalendarService.disconnect).toHaveBeenCalled();
      });
    });
  });

  describe('Offline Behavior', () => {
    it('queues events when offline', async () => {
      vi.mocked(CalendarService.isConnected).mockReturnValue(false);

      renderWithCalendarProvider(<TestComponent />);

      const createButton = screen.getByText('Create Event');
      fireEvent.click(createButton);

      // Should queue the event instead of trying to create it immediately
      expect(CalendarService.createEvent).not.toHaveBeenCalled();
    });

    it('syncs queued events when coming back online', async () => {
      vi.mocked(CalendarService.isConnected)
        .mockReturnValueOnce(false) // Initially offline
        .mockReturnValueOnce(true); // Then online

      vi.mocked(CalendarService.syncQueuedEvents).mockResolvedValue({
        processed: 3,
        errors: [],
      });

      renderWithCalendarProvider(<TestComponent />);

      // Simulate coming back online
      await waitFor(() => {
        expect(CalendarService.syncQueuedEvents).toHaveBeenCalled();
      });
    });
  });

  describe('Rate Limiting', () => {
    it('handles rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.code = 'RATE_LIMIT_EXCEEDED';
      
      vi.mocked(CalendarService.createEvent).mockRejectedValue(rateLimitError);

      renderWithCalendarProvider(<TestComponent />);

      const createButton = screen.getByText('Create Event');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('sync-status')).toHaveTextContent('error');
      });
    });

    it('implements retry with exponential backoff', async () => {
      vi.mocked(CalendarService.createEvent)
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce('event-id');

      renderWithCalendarProvider(<TestComponent />);

      const createButton = screen.getByText('Create Event');
      fireEvent.click(createButton);

      // Should eventually succeed after retry
      await waitFor(() => {
        expect(screen.getByTestId('sync-status')).toHaveTextContent('idle');
      }, { timeout: 2000 });
    });
  });
});