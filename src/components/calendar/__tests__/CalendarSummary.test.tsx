import { render, screen, waitFor } from '@testing-library/react';
import { vi, MockedFunction } from 'vitest';
import { CalendarSummary } from '../CalendarSummary';
import { useAuth } from '../../../contexts/AuthContext';
import { getEventsForDate, getUpcomingEvents, getOverdueEvents } from '../../../services/calendarService';
import { CalendarEvent, User } from '../../../types';

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

const mockedUseAuth = useAuth as MockedFunction<typeof useAuth>;
const mockedGetEventsForDate = getEventsForDate as MockedFunction<typeof getEventsForDate>;
const mockedGetUpcomingEvents = getUpcomingEvents as MockedFunction<typeof getUpcomingEvents>;
const mockedGetOverdueEvents = getOverdueEvents as MockedFunction<typeof getOverdueEvents>;

describe('CalendarSummary', () => {
  const mockUser: User = { uid: 'test-user-id', email: 'test@example.com', createdAt: new Date() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue({ user: mockUser, loading: false, login: vi.fn(), logout: vi.fn(), resetPassword: vi.fn() });
    mockedGetEventsForDate.mockResolvedValue([]);
    mockedGetUpcomingEvents.mockResolvedValue([]);
    mockedGetOverdueEvents.mockResolvedValue([]);
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
    const todayEvents: CalendarEvent[] = [
      {
        id: '1',
        userId: 'test-user-id',
        title: 'Morning Meeting',
        startDate: new Date(),
        endDate: new Date(),
        allDay: false,
        type: 'custom' as const,
        status: 'pending' as const,
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    mockedGetEventsForDate.mockResolvedValue(todayEvents);

    render(<CalendarSummary />);

    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Morning Meeting')).toBeInTheDocument();
    });
  });

  it('renders upcoming events', async () => {
    const upcomingEvents: CalendarEvent[] = [
      {
        id: '2',
        userId: 'test-user-id',
        title: 'Project Deadline',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        allDay: true,
        type: 'project' as const,
        status: 'pending' as const,
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    mockedGetUpcomingEvents.mockResolvedValue(upcomingEvents);

    render(<CalendarSummary />);

    await waitFor(() => {
      expect(screen.getByText('Upcoming')).toBeInTheDocument();
      expect(screen.getByText('Project Deadline')).toBeInTheDocument();
    });
  });

  it('renders overdue events', async () => {
    const overdueEvents: CalendarEvent[] = [
      {
        id: '3',
        userId: 'test-user-id',
        title: 'Overdue Task',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        endDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        allDay: false,
        type: 'task' as const,
        status: 'pending' as const,
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    mockedGetOverdueEvents.mockResolvedValue(overdueEvents);

    render(<CalendarSummary />);

    await waitFor(() => {
      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText('Overdue Task')).toBeInTheDocument();
    });
  });

  it('renders error state when service fails', async () => {
    mockedGetEventsForDate.mockRejectedValue(new Error('Service error'));

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
    const events: CalendarEvent[] = [
      {
        id: '1',
        userId: 'test-user-id',
        title: 'Task Event',
        startDate: new Date(),
        endDate: new Date(),
        allDay: false,
        type: 'task' as const,
        status: 'pending' as const,
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        userId: 'test-user-id',
        title: 'Plant Care',
        startDate: new Date(),
        endDate: new Date(),
        allDay: false,
        type: 'plant_care' as const,
        status: 'pending' as const,
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    mockedGetEventsForDate.mockResolvedValue(events);

    render(<CalendarSummary />);

    await waitFor(() => {
      expect(screen.getByText('Task Event')).toBeInTheDocument();
      expect(screen.getByText('Plant Care')).toBeInTheDocument();
      expect(screen.getByText('task')).toBeInTheDocument();
      expect(screen.getByText('plant care')).toBeInTheDocument();
    });
  });

  it('formats event times correctly', async () => {
    const events: CalendarEvent[] = [
      {
        id: '1',
        userId: 'test-user-id',
        title: 'Timed Event',
        startDate: new Date('2024-01-15T09:30:00'),
        endDate: new Date('2024-01-15T10:30:00'),
        allDay: false,
        type: 'custom' as const,
        status: 'pending' as const,
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        userId: 'test-user-id',
        title: 'All Day Event',
        startDate: new Date('2024-01-15T00:00:00'),
        endDate: new Date('2024-01-15T23:59:59'),
        allDay: true,
        type: 'custom' as const,
        status: 'pending' as const,
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ];

    mockedGetEventsForDate.mockResolvedValue(events);

    render(<CalendarSummary />);

    await waitFor(() => {
      expect(screen.getByText('Timed Event')).toBeInTheDocument();
      expect(screen.getByText('All Day Event')).toBeInTheDocument();
      expect(screen.getByText('All day')).toBeInTheDocument();
    });
  });

  it('does not render when user is not authenticated', () => {
    mockedUseAuth.mockReturnValue({ user: null, loading: false, login: vi.fn(), logout: vi.fn(), resetPassword: vi.fn() });

    render(<CalendarSummary />);

    // Should show loading initially, then not make any service calls
    expect(getEventsForDate).not.toHaveBeenCalled();
    expect(getUpcomingEvents).not.toHaveBeenCalled();
    expect(getOverdueEvents).not.toHaveBeenCalled();
  });
});