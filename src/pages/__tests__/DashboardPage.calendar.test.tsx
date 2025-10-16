import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { DashboardPage } from '../DashboardPage';
import { useAuth } from '../../contexts/AuthContext';
import { usePlants } from '../../hooks/usePlants';
import { useProjects } from '../../hooks/useProjects';
import { useTasks } from '../../hooks/useTasks';
import { useTranslation } from '../../hooks/useTranslation';
import { getUpcomingEvents } from '../../services/calendarService';

// Mock all the hooks and services
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../../hooks/usePlants', () => ({
  usePlants: vi.fn()
}));

vi.mock('../../hooks/useProjects', () => ({
  useProjects: vi.fn()
}));

vi.mock('../../hooks/useTasks', () => ({
  useTasks: vi.fn()
}));

vi.mock('../../hooks/useTranslation', () => ({
  useTranslation: vi.fn()
}));

vi.mock('../../services/calendarService', () => ({
  getUpcomingEvents: vi.fn()
}));

// Mock the CalendarSummary component
vi.mock('../../components/calendar', () => ({
  CalendarSummary: () => (
    <div data-testid="calendar-summary">
      <h3>Calendar Summary</h3>
      <p>Today's events and upcoming items</p>
    </div>
  )
}));

// Mock the layout components
vi.mock('../../components/layout', () => ({
  ContentArea: ({ title, subtitle, children }: any) => (
    <div data-testid="content-area">
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
      {children}
    </div>
  ),
  GridLayout: ({ children }: any) => (
    <div data-testid="grid-layout">{children}</div>
  ),
  StatsCard: ({ title, value, icon, description, href }: any) => (
    <div data-testid="stats-card">
      <span>{icon}</span>
      <h4>{title}</h4>
      <span>{value}</span>
      <p>{description}</p>
      <a href={href}>Link</a>
    </div>
  )
}));

describe('DashboardPage Calendar Integration', () => {
  const mockUser = { uid: 'test-user-id', email: 'test@example.com' };
  const mockTranslation = (key: string) => key;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    (useAuth as any).mockReturnValue({ user: mockUser });
    (usePlants as any).mockReturnValue({ plants: [] });
    (useProjects as any).mockReturnValue({ projects: [] });
    (useTasks as any).mockReturnValue({ tasks: [] });
    (useTranslation as any).mockReturnValue({ t: mockTranslation });
    (getUpcomingEvents as any).mockResolvedValue([]);
  });

  it('renders calendar summary component', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('calendar-summary')).toBeInTheDocument();
      expect(screen.getByText('Calendar Summary')).toBeInTheDocument();
      expect(screen.getByText("Today's events and upcoming items")).toBeInTheDocument();
    });
  });

  it('loads and displays upcoming events count in stats', async () => {
    const mockEvents = [
      { id: '1', title: 'Event 1', startDate: new Date() },
      { id: '2', title: 'Event 2', startDate: new Date() },
      { id: '3', title: 'Event 3', startDate: new Date() }
    ];
    
    (getUpcomingEvents as any).mockResolvedValue(mockEvents);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(getUpcomingEvents).toHaveBeenCalledWith(mockUser.uid, 7);
    });

    // Check that the stats card shows the correct count
    const statsCards = screen.getAllByTestId('stats-card');
    const calendarStatsCard = statsCards.find(card => 
      card.textContent?.includes('📅') && card.textContent?.includes('3')
    );
    
    expect(calendarStatsCard).toBeInTheDocument();
  });

  it('handles calendar service errors gracefully', async () => {
    (getUpcomingEvents as any).mockRejectedValue(new Error('Calendar service error'));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(getUpcomingEvents).toHaveBeenCalledWith(mockUser.uid, 7);
    });

    // Should show 0 events when there's an error
    const statsCards = screen.getAllByTestId('stats-card');
    const calendarStatsCard = statsCards.find(card => 
      card.textContent?.includes('📅') && card.textContent?.includes('0')
    );
    
    expect(calendarStatsCard).toBeInTheDocument();
  });

  it('does not load calendar data when user is not authenticated', () => {
    (useAuth as any).mockReturnValue({ user: null });

    render(<DashboardPage />);

    expect(getUpcomingEvents).not.toHaveBeenCalled();
  });

  it('includes calendar link in stats card', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      const statsCards = screen.getAllByTestId('stats-card');
      const calendarStatsCard = statsCards.find(card => 
        card.textContent?.includes('📅')
      );
      
      expect(calendarStatsCard).toBeInTheDocument();
      expect(calendarStatsCard?.querySelector('a')).toHaveAttribute('href', '/calendar');
    });
  });

  it('updates stats when calendar data changes', async () => {
    // Mock initial events
    const mockEvents = [
      { id: '1', title: 'New Event', startDate: new Date() }
    ];
    (getUpcomingEvents as any).mockResolvedValue(mockEvents);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(getUpcomingEvents).toHaveBeenCalledWith(mockUser.uid, 7);
      const statsCards = screen.getAllByTestId('stats-card');
      const calendarStatsCard = statsCards.find(card => 
        card.textContent?.includes('📅') && card.textContent?.includes('1')
      );
      
      expect(calendarStatsCard).toBeInTheDocument();
    });
  });

  it('renders all dashboard sections with calendar integration', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      // Check that all main sections are present
      expect(screen.getByText('dashboard:overview')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-summary')).toBeInTheDocument();
      expect(screen.getByText('dashboard:gettingStarted')).toBeInTheDocument();
      
      // Check that stats cards are rendered
      const statsCards = screen.getAllByTestId('stats-card');
      expect(statsCards).toHaveLength(4); // plants, projects, tasks, calendar
      
      // Check that calendar-related elements are present (there are multiple calendar icons)
      const calendarIcons = screen.getAllByText('📅');
      expect(calendarIcons.length).toBeGreaterThan(0);
    });
  });
});