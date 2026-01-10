import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setLanguage } from '../../test/setup-i18n';
import { vi } from 'vitest';
import { CalendarPage } from '../CalendarPage';
import { useAuth } from '../../contexts/AuthContext';

// Mock the auth context
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock the calendar components
vi.mock('../../components/calendar/CalendarView', () => ({
  CalendarView: ({ onDateSelect, onEventClick }: any) => (
    <div data-testid="calendar-view">
      <button onClick={() => onDateSelect(new Date('2024-01-15'))}>
        Select Date
      </button>
      <button onClick={() => onEventClick({ id: '1', title: 'Test Event' })}>
        Click Event
      </button>
    </div>
  )
}));

vi.mock('../../components/calendar/DayView', () => ({
  DayView: ({ selectedDate, onDateChange, onEventClick }: any) => (
    <div data-testid="day-view">
      <span>Selected: {selectedDate.toDateString()}</span>
      <button onClick={() => onDateChange(new Date('2024-01-16'))}>
        Change Date
      </button>
      <button onClick={() => onEventClick({ id: '2', title: 'Day Event' })}>
        Click Day Event
      </button>
    </div>
  )
}));

vi.mock('../../components/calendar/EventDetailsModal', () => ({
  EventDetailsModal: ({ isOpen, event, onClose }: any) => (
    isOpen ? (
      <div data-testid="event-details-modal">
        <span>Event: {event?.title}</span>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

vi.mock('../../components/calendar/EventForm', () => ({
  EventForm: ({ isOpen, onClose, event }: any) => (
    isOpen ? (
      <div data-testid="event-form">
        <span>{event ? 'Edit Event' : 'New Event'}</span>
        <button onClick={onClose}>Close Form</button>
      </div>
    ) : null
  )
}));

describe('CalendarPage', () => {
  const mockUser = { uid: 'test-user-id', email: 'test@example.com' };

beforeEach(() => {
    vi.clearAllMocks();
    setLanguage('en');
  });

  it.skip('renders login message when user is not authenticated', () => {
    (useAuth as any).mockReturnValue({ user: null });

    render(<CalendarPage />);

    expect(screen.getByText('Please log in to view your calendar.')).toBeInTheDocument();
  });

  it.skip('renders calendar page with month view by default', () => {
    (useAuth as any).mockReturnValue({ user: mockUser });

    render(<CalendarPage />);

    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Manage your events and schedule')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
    expect(screen.queryByTestId('day-view')).not.toBeInTheDocument();
  });

  it('switches to day view when day button is clicked', async () => {
    (useAuth as any).mockReturnValue({ user: mockUser });

    render(<CalendarPage />);

    const dayButton = screen.getByRole('button', { name: /day/i });
    fireEvent.click(dayButton);

    await waitFor(() => {
      expect(screen.getByTestId('day-view')).toBeInTheDocument();
      expect(screen.queryByTestId('calendar-view')).not.toBeInTheDocument();
    });
  });

  it('switches to day view when date is selected from month view', async () => {
    (useAuth as any).mockReturnValue({ user: mockUser });

    render(<CalendarPage />);

    const selectDateButton = screen.getByText('Select Date');
    fireEvent.click(selectDateButton);

    await waitFor(() => {
      expect(screen.getByTestId('day-view')).toBeInTheDocument();
      expect(screen.queryByTestId('calendar-view')).not.toBeInTheDocument();
    });
  });

  it('opens event details modal when event is clicked', async () => {
    (useAuth as any).mockReturnValue({ user: mockUser });

    render(<CalendarPage />);

    const eventButton = screen.getByText('Click Event');
    fireEvent.click(eventButton);

    await waitFor(() => {
      expect(screen.getByTestId('event-details-modal')).toBeInTheDocument();
      expect(screen.getByText('Event: Test Event')).toBeInTheDocument();
    });
  });

  it.skip('opens event form when new event button is clicked', async () => {
    (useAuth as any).mockReturnValue({ user: mockUser });

    render(<CalendarPage />);

    const newEventButton = screen.getByRole('button', { name: /new event/i });
    fireEvent.click(newEventButton);

    await waitFor(() => {
      expect(screen.getByTestId('event-form')).toBeInTheDocument();
      expect(screen.getByTestId('event-form')).toHaveTextContent('New Event');
    });
  });

  it('closes modals when close buttons are clicked', async () => {
    (useAuth as any).mockReturnValue({ user: mockUser });

    render(<CalendarPage />);

    // Open event details modal
    const eventButton = screen.getByText('Click Event');
    fireEvent.click(eventButton);

    await waitFor(() => {
      expect(screen.getByTestId('event-details-modal')).toBeInTheDocument();
    });

    // Close modal
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('event-details-modal')).not.toBeInTheDocument();
    });
  });

  it('handles view switching correctly', async () => {
    (useAuth as any).mockReturnValue({ user: mockUser });

    render(<CalendarPage />);

    // Start with month view
    expect(screen.getByTestId('calendar-view')).toBeInTheDocument();

    // Switch to day view
    const dayButton = screen.getByRole('button', { name: /day/i });
    fireEvent.click(dayButton);

    await waitFor(() => {
      expect(screen.getByTestId('day-view')).toBeInTheDocument();
    });

    // Switch back to month view
    const monthButton = screen.getByRole('button', { name: /month/i });
    fireEvent.click(monthButton);

    await waitFor(() => {
      expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
      expect(screen.queryByTestId('day-view')).not.toBeInTheDocument();
    });
  });
});