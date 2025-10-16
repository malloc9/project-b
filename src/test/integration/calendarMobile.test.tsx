import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthContext } from '../../contexts/AuthContext';
import { CalendarView } from '../../components/calendar/CalendarView';
import { DayView } from '../../components/calendar/DayView';
import { EventForm } from '../../components/calendar/EventForm';
import { VirtualEventList } from '../../components/calendar/VirtualEventList';
import * as optimizedCalendarService from '../../services/optimizedCalendarService';
import type { CalendarEvent } from '../../types';

// Mock Firebase
vi.mock('../../config/firebase', () => ({
  db: {},
  auth: {}
}));

vi.mock('../../services/optimizedCalendarService');

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

// Mock viewport dimensions
const mockViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Trigger resize event
  fireEvent(window, new Event('resize'));
};

describe('Calendar Mobile Responsiveness Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    vi.mocked(optimizedCalendarService.getEventsForCalendarViewOptimized).mockResolvedValue([
      createMockEvent(),
      createMockEvent({
        id: 'event-2',
        title: 'Long Event Title That Should Be Truncated on Mobile',
        type: 'project'
      })
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset viewport to desktop size
    mockViewport(1024, 768);
  });

  describe('Mobile Calendar View (320px - 768px)', () => {
    it('should adapt calendar grid for mobile screens', async () => {
      mockViewport(375, 667); // iPhone SE dimensions
      
      const { container } = renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });

      // Calendar should use mobile-optimized layout
      const calendarGrid = container.querySelector('[data-testid="calendar-grid"]');
      expect(calendarGrid).toHaveClass('grid-cols-7'); // Still 7 columns but smaller

      // Day cells should be smaller on mobile
      const dayCells = container.querySelectorAll('[data-testid="calendar-day"]');
      dayCells.forEach(cell => {
        expect(cell).toHaveClass('min-h-[80px]'); // Smaller than desktop
      });

      // Event text should be truncated
      const eventElements = container.querySelectorAll('[data-testid="calendar-event"]');
      eventElements.forEach(event => {
        expect(event).toHaveClass('text-xs'); // Smaller text
        expect(event).toHaveClass('truncate'); // Text truncation
      });
    });

    it('should show fewer events per day on mobile', async () => {
      mockViewport(320, 568); // iPhone 5 dimensions
      
      const manyEvents = Array.from({ length: 10 }, (_, i) => 
        createMockEvent({
          id: `event-${i}`,
          title: `Event ${i}`,
          startDate: new Date('2024-01-15T10:00:00Z')
        })
      );

      vi.mocked(optimizedCalendarService.getEventsForCalendarViewOptimized)
        .mockResolvedValue(manyEvents);

      const { container } = renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText('Event 0')).toBeInTheDocument();
      });

      // Should show fewer events on mobile (e.g., max 2 instead of 3)
      const dayCell = container.querySelector('[data-date="2024-01-15"]');
      const visibleEvents = dayCell?.querySelectorAll('[data-testid="calendar-event"]');
      expect(visibleEvents?.length).toBeLessThanOrEqual(2);

      // Should show "+N more" indicator
      expect(screen.getByText(/\+\d+ more/)).toBeInTheDocument();
    });

    it('should use touch-friendly navigation on mobile', async () => {
      mockViewport(375, 667);
      
      const user = userEvent.setup();
      renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });

      // Navigation buttons should be larger on mobile
      const prevButton = screen.getByLabelText(/previous month/i);
      const nextButton = screen.getByLabelText(/next month/i);

      expect(prevButton).toHaveClass('p-3'); // Larger padding for touch
      expect(nextButton).toHaveClass('p-3');

      // Should support swipe gestures (simulated with touch events)
      const calendarContainer = screen.getByTestId('calendar-container');
      
      // Simulate swipe left (next month)
      fireEvent.touchStart(calendarContainer, {
        touches: [{ clientX: 200, clientY: 100 }]
      });
      fireEvent.touchMove(calendarContainer, {
        touches: [{ clientX: 50, clientY: 100 }]
      });
      fireEvent.touchEnd(calendarContainer);

      // Should navigate to next month
      await waitFor(() => {
        expect(screen.getByText(/February 2024/)).toBeInTheDocument();
      });
    });
  });

  describe('Tablet Calendar View (768px - 1024px)', () => {
    it('should optimize layout for tablet screens', async () => {
      mockViewport(768, 1024); // iPad dimensions
      
      const { container } = renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });

      // Should use medium-sized layout
      const calendarGrid = container.querySelector('[data-testid="calendar-grid"]');
      expect(calendarGrid).toHaveClass('grid-cols-7');

      // Day cells should be medium-sized
      const dayCells = container.querySelectorAll('[data-testid="calendar-day"]');
      dayCells.forEach(cell => {
        expect(cell).toHaveClass('min-h-[100px]'); // Between mobile and desktop
      });

      // Should show more events than mobile but less than desktop
      const dayWithEvents = container.querySelector('[data-date="2024-01-15"]');
      const visibleEvents = dayWithEvents?.querySelectorAll('[data-testid="calendar-event"]');
      expect(visibleEvents?.length).toBeLessThanOrEqual(3);
    });

    it('should support both touch and mouse interactions on tablet', async () => {
      mockViewport(768, 1024);
      
      const user = userEvent.setup();
      renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
      });

      // Should work with mouse clicks
      const eventElement = screen.getByText('Test Event');
      await user.click(eventElement);

      // Should also work with touch events
      fireEvent.touchStart(eventElement);
      fireEvent.touchEnd(eventElement);

      // Both should trigger event selection
      expect(eventElement).toHaveClass('selected'); // Assuming selection styling
    });
  });

  describe('Mobile Day View', () => {
    it('should optimize day view for mobile screens', async () => {
      mockViewport(375, 667);
      
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

      // Timeline should be narrower on mobile
      const timeline = container.querySelector('[data-testid="day-timeline"]');
      expect(timeline).toHaveClass('w-12'); // Narrower timeline

      // Events should stack vertically on mobile when overlapping
      const eventContainer = container.querySelector('[data-testid="day-events"]');
      expect(eventContainer).toHaveClass('flex-col'); // Vertical stacking
    });

    it('should support touch scrolling in day view', async () => {
      mockViewport(375, 667);
      
      const selectedDate = new Date('2024-01-15');
      const { container } = renderWithAuth(
        <DayView 
          selectedDate={selectedDate}
          onEventClick={() => {}}
        />
      );

      const scrollContainer = container.querySelector('[data-testid="day-scroll-container"]');
      
      // Should be scrollable
      expect(scrollContainer).toHaveClass('overflow-y-auto');
      
      // Should support momentum scrolling on iOS
      expect(scrollContainer).toHaveStyle({ 
        WebkitOverflowScrolling: 'touch' 
      });
    });
  });

  describe('Mobile Event Forms', () => {
    it('should optimize event form for mobile input', async () => {
      mockViewport(375, 667);
      
      const { container } = renderWithAuth(
        <EventForm 
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      // Form should be full-width on mobile
      const form = container.querySelector('form');
      expect(form).toHaveClass('w-full');

      // Input fields should be larger for touch
      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toHaveClass('text-base'); // Larger text to prevent zoom
      expect(titleInput).toHaveClass('p-3'); // Larger padding

      // Date/time inputs should use native mobile pickers
      const dateInput = screen.getByLabelText(/start date/i);
      expect(dateInput).toHaveAttribute('type', 'date');

      const timeInput = screen.getByLabelText(/start time/i);
      expect(timeInput).toHaveAttribute('type', 'time');
    });

    it('should handle mobile keyboard interactions', async () => {
      mockViewport(375, 667);
      
      const user = userEvent.setup();
      renderWithAuth(
        <EventForm 
          onSubmit={() => {}}
          onCancel={() => {}}
        />
      );

      const titleInput = screen.getByLabelText(/title/i);
      
      // Should focus input when tapped
      await user.click(titleInput);
      expect(titleInput).toHaveFocus();

      // Should handle virtual keyboard appearance
      // (This would typically adjust viewport height)
      mockViewport(375, 400); // Simulated keyboard appearance
      
      // Form should still be usable with reduced viewport
      expect(titleInput).toBeVisible();
    });
  });

  describe('Mobile Virtual Event List', () => {
    it('should optimize virtual scrolling for mobile', async () => {
      mockViewport(375, 667);
      
      const manyEvents = Array.from({ length: 1000 }, (_, i) => 
        createMockEvent({
          id: `event-${i}`,
          title: `Event ${i}`
        })
      );

      const { container } = renderWithAuth(
        <VirtualEventList
          events={manyEvents}
          itemHeight={100} // Smaller items on mobile
          containerHeight={400}
          onEventClick={() => {}}
        />
      );

      // Should render efficiently on mobile
      const virtualContainer = container.querySelector('[data-testid="virtual-container"]');
      expect(virtualContainer).toBeInTheDocument();

      // Should use smaller item heights on mobile
      const renderedItems = container.querySelectorAll('[data-testid="virtual-item"]');
      renderedItems.forEach(item => {
        expect(item).toHaveStyle({ height: '100px' });
      });

      // Should support touch scrolling
      expect(virtualContainer).toHaveClass('overflow-auto');
    });

    it('should handle touch gestures in virtual list', async () => {
      mockViewport(375, 667);
      
      const events = Array.from({ length: 100 }, (_, i) => 
        createMockEvent({
          id: `event-${i}`,
          title: `Event ${i}`
        })
      );

      const { container } = renderWithAuth(
        <VirtualEventList
          events={events}
          itemHeight={100}
          containerHeight={400}
          onEventClick={() => {}}
        />
      );

      const scrollContainer = container.querySelector('[data-testid="virtual-container"]');
      
      // Simulate touch scroll
      fireEvent.touchStart(scrollContainer!, {
        touches: [{ clientX: 0, clientY: 100 }]
      });
      fireEvent.touchMove(scrollContainer!, {
        touches: [{ clientX: 0, clientY: 50 }]
      });
      fireEvent.touchEnd(scrollContainer!);

      // Should update scroll position
      await waitFor(() => {
        expect(scrollContainer!.scrollTop).toBeGreaterThan(0);
      });
    });
  });

  describe('Mobile Performance Optimizations', () => {
    it('should reduce animations on mobile for better performance', async () => {
      mockViewport(375, 667);
      
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

      renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });

      // Animations should be reduced or disabled
      const animatedElements = document.querySelectorAll('[class*="transition"]');
      animatedElements.forEach(element => {
        expect(element).toHaveClass('motion-reduce:transition-none');
      });
    });

    it('should lazy load non-critical features on mobile', async () => {
      mockViewport(375, 667);
      
      renderWithAuth(<CalendarView />);

      // Critical content should load immediately
      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });

      // Non-critical features should be lazy loaded
      // (This would depend on specific implementation)
      const advancedFilters = screen.queryByTestId('advanced-filters');
      expect(advancedFilters).not.toBeInTheDocument(); // Not loaded initially

      // Should load when needed
      const filtersButton = screen.getByRole('button', { name: /filters/i });
      const user = userEvent.setup();
      await user.click(filtersButton);

      await waitFor(() => {
        expect(screen.getByTestId('advanced-filters')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Accessibility', () => {
    it('should maintain accessibility on mobile screens', async () => {
      mockViewport(375, 667);
      
      renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText(/January 2024/)).toBeInTheDocument();
      });

      // Touch targets should be at least 44px (iOS) or 48px (Android)
      const touchTargets = screen.getAllByRole('button');
      touchTargets.forEach(target => {
        const styles = window.getComputedStyle(target);
        const minSize = Math.min(
          parseInt(styles.minHeight) || 0,
          parseInt(styles.minWidth) || 0
        );
        expect(minSize).toBeGreaterThanOrEqual(44);
      });

      // Should support screen reader navigation
      const calendarGrid = screen.getByRole('grid');
      expect(calendarGrid).toHaveAttribute('aria-label');

      // Should announce changes for screen readers
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toBeInTheDocument();
    });

    it('should handle focus management on mobile', async () => {
      mockViewport(375, 667);
      
      const user = userEvent.setup();
      renderWithAuth(<CalendarView />);

      await waitFor(() => {
        expect(screen.getByText('Test Event')).toBeInTheDocument();
      });

      // Should manage focus properly when opening modals
      const eventElement = screen.getByText('Test Event');
      await user.click(eventElement);

      // Focus should move to modal
      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toBeInTheDocument();
        expect(modal).toHaveFocus();
      });
    });
  });
});