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

  it.skip('renders edit event form when event is provided', () => {
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

  it.skip('adds and removes notifications', () => {
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

  it.skip('updates existing event successfully', async () => {
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

  it.skip('handles form submission errors', async () => {
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

  it.skip('closes modal when cancel is clicked', () => {
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
});