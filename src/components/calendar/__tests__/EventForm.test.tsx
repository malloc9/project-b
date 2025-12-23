import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, MockedFunction } from 'vitest';
import { EventForm } from '../EventForm';
import { useAuth } from '../../../contexts/AuthContext';
import * as calendarService from '../../../services/calendarService';
import { User } from '../../../types';

// Mock the auth context
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

const mockedUseAuth = useAuth as MockedFunction<typeof useAuth>;

// Mock the calendar service
vi.mock('../../../services/calendarService', () => ({
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  validateEventData: vi.fn(() => [])
}));

const mockUser: User = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  createdAt: new Date()
};

const mockEvent = {
  id: 'test-event-id',
  userId: 'test-user-id',
  title: 'Test Event',
  description: 'Test Description',
  startDate: new Date('2024-01-15T09:00:00'),
  endDate: new Date('2024-01-15T10:00:00'),
  allDay: false,
  type: 'custom' as const,
  status: 'pending' as const,
  notifications: [],
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('EventForm', () => {
  const mockOnClose = vi.fn();
  const mockOnEventSaved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue({ user: mockUser, loading: false, login: vi.fn(), logout: vi.fn(), resetPassword: vi.fn() });
  });

  it('renders create event form when no event is provided', () => {
    render(
      <EventForm
        isOpen={true}
        onClose={mockOnClose}
        onEventSaved={mockOnEventSaved}
      />
    );

    expect(screen.getByRole('heading', { name: /create event/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/all day event/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create event/i })).toBeInTheDocument();
  });

  it('renders edit event form when event is provided', () => {
    render(
      <EventForm
        event={mockEvent}
        isOpen={true}
        onClose={mockOnClose}
        onEventSaved={mockOnEventSaved}
      />
    );

    expect(screen.getByText('Edit Event')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Event')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Update Event')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(
      <EventForm
        isOpen={true}
        onClose={mockOnClose}
        onEventSaved={mockOnEventSaved}
      />
    );

    const submitButton = screen.getByRole('button', { name: /create event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });
  });

  it('validates date logic', async () => {
    render(
      <EventForm
        isOpen={true}
        onClose={mockOnClose}
        onEventSaved={mockOnEventSaved}
      />
    );

    // Fill in title
    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'Test Event' } });

    // Set end date before start date
    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);
    
    fireEvent.change(startDateInput, { target: { value: '2024-01-15' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-14' } });

    const submitButton = screen.getByRole('button', { name: /create event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('End date/time must be after start date/time')).toBeInTheDocument();
    });
  });

  it('handles all day toggle correctly', () => {
    render(
      <EventForm
        isOpen={true}
        onClose={mockOnClose}
        onEventSaved={mockOnEventSaved}
      />
    );

    const allDayCheckbox = screen.getByLabelText(/all day event/i);
    
    // Initially should show time inputs
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();

    // Toggle all day
    fireEvent.click(allDayCheckbox);

    // Time inputs should be hidden
    expect(screen.queryByLabelText(/start time/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/end time/i)).not.toBeInTheDocument();
  });

  it('adds and removes notifications', () => {
    render(
      <EventForm
        isOpen={true}
        onClose={mockOnClose}
        onEventSaved={mockOnEventSaved}
      />
    );

    // Initially no notifications
    expect(screen.getByText('No notifications set')).toBeInTheDocument();

    // Add notification
    const addButton = screen.getByText('Add');
    fireEvent.click(addButton);

    // Should show notification controls
    expect(screen.queryByText('No notifications set')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('15')).toBeInTheDocument(); // Default timing
    expect(screen.getByText('min before')).toBeInTheDocument();

    // Remove notification - find the trash icon button
    const removeButtons = screen.getAllByRole('button');
    const removeButton = removeButtons.find(button => 
      button.className.includes('text-red-600')
    );
    expect(removeButton).toBeDefined();
    fireEvent.click(removeButton!);

    // Should be back to no notifications
    expect(screen.getByText('No notifications set')).toBeInTheDocument();
  });

  it('creates new event successfully', async () => {
    const mockCreateEvent = vi.mocked(calendarService.createEvent);
    mockCreateEvent.mockResolvedValue(mockEvent);

    render(
      <EventForm
        isOpen={true}
        onClose={mockOnClose}
        onEventSaved={mockOnEventSaved}
      />
    );

    // Fill in form
    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);

    fireEvent.change(titleInput, { target: { value: 'New Event' } });
    fireEvent.change(descriptionInput, { target: { value: 'New Description' } });
    fireEvent.change(startDateInput, { target: { value: '2024-01-15' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-15' } });

    // Submit form - use role selector to be more specific
    const submitButton = screen.getByRole('button', { name: /create event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateEvent).toHaveBeenCalledWith(
        mockUser.uid,
        expect.objectContaining({
          title: 'New Event',
          description: 'New Description',
          type: 'custom',
          status: 'pending'
        })
      );
      expect(mockOnEventSaved).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('updates existing event successfully', async () => {
    const mockUpdateEvent = vi.mocked(calendarService.updateEvent);
    mockUpdateEvent.mockResolvedValue(mockEvent);

    render(
      <EventForm
        event={mockEvent}
        isOpen={true}
        onClose={mockOnClose}
        onEventSaved={mockOnEventSaved}
      />
    );

    // Modify title
    const titleInput = screen.getByDisplayValue('Test Event');
    fireEvent.change(titleInput, { target: { value: 'Updated Event' } });

    // Submit form
    const submitButton = screen.getByText('Update Event');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateEvent).toHaveBeenCalledWith(
        mockUser.uid,
        mockEvent.id,
        expect.objectContaining({
          title: 'Updated Event'
        })
      );
      expect(mockOnEventSaved).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles form submission errors', async () => {
    const mockCreateEvent = vi.mocked(calendarService.createEvent);
    mockCreateEvent.mockRejectedValue(new Error('Network error'));

    render(
      <EventForm
        isOpen={true}
        onClose={mockOnClose}
        onEventSaved={mockOnEventSaved}
      />
    );

    // Fill in minimal form
    const titleInput = screen.getByLabelText(/title/i);
    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);

    fireEvent.change(titleInput, { target: { value: 'Test Event' } });
    fireEvent.change(startDateInput, { target: { value: '2024-01-15' } });
    fireEvent.change(endDateInput, { target: { value: '2024-01-15' } });

    // Submit form - use role selector to be more specific
    const submitButton = screen.getByRole('button', { name: /create event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to save event. Please try again.')).toBeInTheDocument();
    });

    // Should not close modal or call onEventSaved on error
    expect(mockOnClose).not.toHaveBeenCalled();
    expect(mockOnEventSaved).not.toHaveBeenCalled();
  });

  it('closes modal when cancel is clicked', () => {
    render(
      <EventForm
        isOpen={true}
        onClose={mockOnClose}
        onEventSaved={mockOnEventSaved}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    render(
      <EventForm
        isOpen={false}
        onClose={mockOnClose}
        onEventSaved={mockOnEventSaved}
      />
    );

    expect(screen.queryByText('Create Event')).not.toBeInTheDocument();
  });

  it('initializes with provided initial date', () => {
    const initialDate = new Date('2024-02-20');
    
    render(
      <EventForm
        isOpen={true}
        onClose={mockOnClose}
        onEventSaved={mockOnEventSaved}
        initialDate={initialDate}
      />
    );

    const startDateInput = screen.getByLabelText(/start date/i) as HTMLInputElement;
    const endDateInput = screen.getByLabelText(/end date/i) as HTMLInputElement;

    expect(startDateInput.value).toBe('2024-02-20');
    expect(endDateInput.value).toBe('2024-02-20');
  });
});