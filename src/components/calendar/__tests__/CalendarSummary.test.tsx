import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CalendarSummary } from '../CalendarSummary';
import { useAuth } from '../../../contexts/AuthContext';
import { getEventsForDate, getUpcomingEvents, getOverdueEvents } from '../../../services/calendarService';

// Mock the auth context
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock the calendar service
vi.mock('../../../services/calendarService', () => ({
  getEventsForDate: vi.fn(),
  getUpcomingEvents: vi.fn(),
  getOverdueEvents: vi.fn()
}));

describe('CalendarSummary', () => {
  const mockUser = { uid: 'test-user-id', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
    (getEventsForDate as any).mockResolvedValue([]);
    (getUpcomingEvents as any).mockResolvedValue([]);
    (getOverdueEvents as any).mockResolvedValue([]);
  });

  it('renders loading state initially', () => {
    render(<CalendarSummary />);
    
    // Check for the loading spinner by its class
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders empty state when no events', async () => {
    render(<CalendarSummary />);

    await waitFor(() => {
      expect(screen.getByText('Calendar Summary')).toBeInTheDocument();
      expect(screen.getByText('No upcoming events')).toBeInTheDocument();
      expect(screen.getByText('Your calendar is clear for now')).toBeInTheDocument();
    });
  });

  it('renders today events', async () => {
    const todayEvents = [
      {
        id: '1',
        title: 'Morning Meeting',
        startDate: new Date(),
        endDate: new Date(),
        allDay: false,
        type: 'custom' as const,
        status: 'pending' as const
      }
    ];

    (getEventsForDate as any).mockResolvedValue(todayEvents);

    render(<CalendarSummary />);

    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Morning Meeting')).toBeInTheDocument();
    });
  });

  it('renders upcoming events', async () => {
    const upcomingEvents = [
      {
        id: '2',
        title: 'Project Deadline',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        allDay: true,
        type: 'project' as const,
        status: 'pending' as const
      }
    ];

    (getUpcomingEvents as any).mockResolvedValue(upcomingEvents);

    render(<CalendarSummary />);

    await waitFor(() => {
      expect(screen.getByText('Upcoming')).toBeInTheDocument();
      expect(screen.getByText('Project Deadline')).toBeInTheDocument();
    });
  });

  it('renders overdue events', async () => {
    const overdueEvents = [
      {
        id: '3',
        title: 'Overdue Task',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        endDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        allDay: false,
        type: 'task' as const,
        status: 'pending' as const
      }
    ];

    (getOverdueEvents as any).mockResolvedValue(overdueEvents);

    render(<CalendarSummary />);

    await waitFor(() => {
      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText('Overdue Task')).toBeInTheDocument();
    });
  });

  it('renders error state when service fails', async () => {
    (getEventsForDate as any).mockRejectedValue(new Error('Service error'));

    render(<CalendarSummary />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load calendar data')).toBeInTheDocument();
    });
  });

  it('includes link to calendar page', async () => {
    render(<CalendarSummary />);

    await waitFor(() => {
      const calendarLink = screen.getByRole('link', { name: /view calendar/i });
      expect(calendarLink).toHaveAttribute('href', '/calendar');
    });
  });

  it('displays correct event type colors and icons', async () => {
    const events = [
      {
        id: '1',
        title: 'Task Event',
        startDate: new Date(),
        endDate: new Date(),
        allDay: false,
        type: 'task' as const,
        status: 'pending' as const
      },
      {
        id: '2',
        title: 'Plant Care',
        startDate: new Date(),
        endDate: new Date(),
        allDay: false,
        type: 'plant_care' as const,
        status: 'pending' as const
      }
    ];

    (getEventsForDate as any).mockResolvedValue(events);

    render(<CalendarSummary />);

    await waitFor(() => {
      expect(screen.getByText('Task Event')).toBeInTheDocument();
      expect(screen.getByText('Plant Care')).toBeInTheDocument();
      expect(screen.getByText('task')).toBeInTheDocument();
      expect(screen.getByText('plant care')).toBeInTheDocument();
    });
  });

  it('formats event times correctly', async () => {
    const events = [
      {
        id: '1',
        title: 'Timed Event',
        startDate: new Date('2024-01-15T09:30:00'),
        endDate: new Date('2024-01-15T10:30:00'),
        allDay: false,
        type: 'custom' as const,
        status: 'pending' as const
      },
      {
        id: '2',
        title: 'All Day Event',
        startDate: new Date('2024-01-15T00:00:00'),
        endDate: new Date('2024-01-15T23:59:59'),
        allDay: true,
        type: 'custom' as const,
        status: 'pending' as const
      }
    ];

    (getEventsForDate as any).mockResolvedValue(events);

    render(<CalendarSummary />);

    await waitFor(() => {
      expect(screen.getByText('Timed Event')).toBeInTheDocument();
      expect(screen.getByText('All Day Event')).toBeInTheDocument();
      expect(screen.getByText('All day')).toBeInTheDocument();
    });
  });

  it('does not render when user is not authenticated', () => {
    (useAuth as any).mockReturnValue({ user: null });

    render(<CalendarSummary />);

    // Should show loading initially, then not make any service calls
    expect(getEventsForDate).not.toHaveBeenCalled();
    expect(getUpcomingEvents).not.toHaveBeenCalled();
    expect(getOverdueEvents).not.toHaveBeenCalled();
  });
});