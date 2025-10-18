import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { DashboardPage } from '../DashboardPage';
import { useAuthenticatedUser } from '../../hooks/useAuthenticatedUser';
import { usePlants } from '../../hooks/usePlants';
import { useProjects } from '../../hooks/useProjects';
import { useTasks } from '../../hooks/useTasks';
import { useTranslation } from '../../hooks/useTranslation';
import { getUpcomingEvents } from '../../services/calendarService';
import type { User } from '../../types';

// Mock all the hooks and services
vi.mock('../../hooks/useAuthenticatedUser');
vi.mock('../../hooks/usePlants');
vi.mock('../../hooks/useProjects');
vi.mock('../../hooks/useTasks');
vi.mock('../../hooks/useTranslation');
vi.mock('../../services/calendarService');

const mockUseAuthenticatedUser = vi.mocked(useAuthenticatedUser);
const mockUsePlants = vi.mocked(usePlants);
const mockUseProjects = vi.mocked(useProjects);
const mockUseTasks = vi.mocked(useTasks);
const mockUseTranslation = vi.mocked(useTranslation);
const mockGetUpcomingEvents = vi.mocked(getUpcomingEvents);

// Mock layout components
vi.mock('../../components/layout', () => ({
  ContentArea: ({ children, title }: any) => <div data-testid="content-area" title={title}>{children}</div>,
  GridLayout: ({ children }: any) => <div data-testid="grid-layout">{children}</div>,
  StatsCard: ({ title, value, description, color }: any) => (
    <div data-testid="stats-card" data-color={color}>
      <div data-testid="stats-title">{title}</div>
      <div data-testid="stats-value">{value}</div>
      <div data-testid="stats-description">{description}</div>
    </div>
  ),
}));

// Mock calendar components
vi.mock('../../components/calendar', () => ({
  CalendarSummary: () => <div data-testid="calendar-summary">Calendar Summary</div>,
}));

describe('DashboardPage Authentication', () => {
  const mockUser: User = {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockUsePlants.mockReturnValue({ plants: [] });
    mockUseProjects.mockReturnValue({ projects: [] });
    mockUseTasks.mockReturnValue({ tasks: [] });
    mockUseTranslation.mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      changeLanguage: vi.fn(),
      isLoading: false,
      error: null,
      supportedLanguages: [],
      currentLanguageConfig: null,
      tCommon: vi.fn(),
      tNavigation: vi.fn(),
      tAuth: vi.fn(),
      tDashboard: vi.fn(),
      tForms: vi.fn(),
      tErrors: vi.fn(),
      formatDate: vi.fn(),
      formatTime: vi.fn(),
      isRTL: false,
    });
  });

  it('should not call getUpcomingEvents when authentication is loading', async () => {
    mockUseAuthenticatedUser.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
    });

    render(<DashboardPage />);

    // Wait a bit to ensure useEffect has run
    await waitFor(() => {
      expect(mockGetUpcomingEvents).not.toHaveBeenCalled();
    });
  });

  it('should not call getUpcomingEvents when user is not authenticated', async () => {
    mockUseAuthenticatedUser.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockGetUpcomingEvents).not.toHaveBeenCalled();
    });
  });

  it('should call getUpcomingEvents when user is authenticated', async () => {
    mockUseAuthenticatedUser.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    mockGetUpcomingEvents.mockResolvedValue([]);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockGetUpcomingEvents).toHaveBeenCalledWith('test-uid', 7);
    });
  });

  it('should show loading state for events', async () => {
    mockUseAuthenticatedUser.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    // Make the promise never resolve to test loading state
    mockGetUpcomingEvents.mockImplementation(() => new Promise(() => {}));

    render(<DashboardPage />);

    await waitFor(() => {
      const statsCards = screen.getAllByTestId('stats-card');
      const eventsCard = statsCards.find(card => 
        card.querySelector('[data-testid="stats-title"]')?.textContent?.includes('thisWeek')
      );
      expect(eventsCard?.querySelector('[data-testid="stats-value"]')?.textContent).toBe('...');
    });
  });

  it('should handle errors gracefully', async () => {
    mockUseAuthenticatedUser.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    const error = { code: 'permission-denied', message: 'Permission denied' };
    mockGetUpcomingEvents.mockRejectedValue(error);

    render(<DashboardPage />);

    await waitFor(() => {
      const statsCards = screen.getAllByTestId('stats-card');
      const eventsCard = statsCards.find(card => 
        card.querySelector('[data-testid="stats-title"]')?.textContent?.includes('thisWeek')
      );
      expect(eventsCard?.getAttribute('data-color')).toBe('red');
      expect(eventsCard?.querySelector('[data-testid="stats-value"]')?.textContent).toBe('0');
    });
  });
});