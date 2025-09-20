import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from '../../App';
import { AuthService } from '../../services/authService';

// Mock Firebase services
vi.mock('../../services/authService');
vi.mock('../../services/plantService');
vi.mock('../../services/projectService');
vi.mock('../../services/simpleTaskService');


// Mock Firebase config and functions
vi.mock('../../config/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
}));

// Mock Firebase functions
vi.mock('@firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn()),
}));

// Mock Firebase app
vi.mock('@firebase/app', () => ({
  getApp: vi.fn(() => ({})),
  initializeApp: vi.fn(() => ({})),
}));

describe('Responsive Design Integration Tests', () => {
  const mockUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AuthService.getCurrentUser).mockResolvedValue(mockUser);
  });

  const setViewport = (width: number, height: number) => {
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
    fireEvent(window, new Event('resize'));
  };

  it('should display mobile layout correctly (320px - 768px)', async () => {
    // iPhone SE viewport
    setViewport(375, 667);

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    // Check for mobile-specific elements
    const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
    expect(mobileMenuButton).toBeInTheDocument();

    // Navigation should be hidden initially on mobile
    const navigation = screen.getByRole('navigation');
    expect(navigation).toHaveClass('hidden'); // Assuming Tailwind classes

    // Click mobile menu to open navigation
    await userEvent.click(mobileMenuButton);

    // Navigation should now be visible
    await waitFor(() => {
      expect(navigation).not.toHaveClass('hidden');
    });

    // Check that content is properly stacked on mobile
    const quickActions = screen.getAllByText(/plant codex|projects|tasks|calendar/i);
    expect(quickActions.length).toBeGreaterThan(0);

    // Stats should be in single column on mobile
    const statsCards = screen.getAllByText(/plants tracked|active projects|pending tasks/i);
    statsCards.forEach(card => {
      const cardElement = card.closest('[class*="grid"]');
      if (cardElement) {
        // Should use mobile grid layout
        expect(cardElement).toHaveClass(/grid-cols-1|sm:grid-cols-2/);
      }
    });
  });

  it('should display tablet layout correctly (768px - 1024px)', async () => {
    // iPad viewport
    setViewport(768, 1024);

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    // Should show expanded navigation but not full desktop layout
    const navigation = screen.getByRole('navigation');
    expect(navigation).toBeInTheDocument();

    // Content should use tablet-appropriate grid layouts
    const quickActions = screen.getAllByText(/plant codex|projects|tasks|calendar/i);
    expect(quickActions.length).toBeGreaterThan(0);

    // Stats should be in 2-3 columns on tablet
    const statsSection = screen.getByText(/overview/i).closest('div');
    if (statsSection) {
      const gridContainer = statsSection.querySelector('[class*="grid"]');
      expect(gridContainer).toHaveClass(/md:grid-cols-2|md:grid-cols-3/);
    }
  });

  it('should display desktop layout correctly (1024px+)', async () => {
    // Desktop viewport
    setViewport(1440, 900);

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    // Should show full desktop navigation
    const navigation = screen.getByRole('navigation');
    expect(navigation).toBeInTheDocument();

    // Mobile menu button should not be visible on desktop
    const mobileMenuButton = screen.queryByRole('button', { name: /menu/i });
    expect(mobileMenuButton).not.toBeInTheDocument();

    // Content should use full desktop grid layouts
    const quickActions = screen.getAllByText(/plant codex|projects|tasks|calendar/i);
    expect(quickActions.length).toBeGreaterThan(0);

    // Stats should be in 4 columns on desktop
    const statsSection = screen.getByText(/overview/i).closest('div');
    if (statsSection) {
      const gridContainer = statsSection.querySelector('[class*="grid"]');
      expect(gridContainer).toHaveClass(/lg:grid-cols-4/);
    }
  });

  it('should handle touch interactions on mobile devices', async () => {
    setViewport(375, 667);
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    // Test touch-friendly button sizes
    const quickActionCards = screen.getAllByRole('link');
    quickActionCards.forEach(card => {
      // Touch targets should be at least 44px (Tailwind's touch-friendly sizing)
      const styles = window.getComputedStyle(card);
      const minHeight = parseInt(styles.minHeight) || parseInt(styles.height);
      expect(minHeight).toBeGreaterThanOrEqual(44);
    });

    // Test swipe gestures (if implemented)
    const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
    await user.click(mobileMenuButton);

    // Navigation should open
    const navigation = screen.getByRole('navigation');
    await waitFor(() => {
      expect(navigation).not.toHaveClass('hidden');
    });
  });

  it('should adapt form layouts for different screen sizes', async () => {
    const user = userEvent.setup();

    // Test mobile form layout
    setViewport(375, 667);

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    // Navigate to plants and create new plant
    const plantsLink = screen.getByRole('link', { name: /plant codex/i });
    await user.click(plantsLink);

    const addPlantButton = screen.getByRole('button', { name: /add plant/i });
    await user.click(addPlantButton);

    // Form should be single column on mobile
    const formInputs = screen.getAllByRole('textbox');
    formInputs.forEach(input => {
      const formGroup = input.closest('[class*="grid"]');
      if (formGroup) {
        expect(formGroup).toHaveClass(/grid-cols-1/);
      }
    });

    // Test desktop form layout
    setViewport(1440, 900);
    fireEvent(window, new Event('resize'));

    // Form may use multiple columns on desktop
    const formContainer = screen.getByRole('form') || screen.getByTestId('plant-form');
    if (formContainer) {
      expect(formContainer).toHaveClass(/lg:grid-cols-2|xl:grid-cols-2/);
    }
  });

  it('should handle image display responsively', async () => {
    setViewport(375, 667);

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    // Navigate to plants page
    const plantsLink = screen.getByRole('link', { name: /plant codex/i });
    await userEvent.click(plantsLink);

    // Images should be responsive
    const images = screen.getAllByRole('img');
    images.forEach(img => {
      // Should have responsive classes
      expect(img).toHaveClass(/w-full|max-w-full|h-auto/);
    });

    // Test different viewport sizes
    setViewport(768, 1024); // Tablet
    fireEvent(window, new Event('resize'));

    setViewport(1440, 900); // Desktop
    fireEvent(window, new Event('resize'));

    // Images should maintain aspect ratio and responsiveness
    const updatedImages = screen.getAllByRole('img');
    updatedImages.forEach(img => {
      expect(img).toHaveClass(/w-full|max-w-full|h-auto/);
    });
  });

  it('should handle navigation menu responsively', async () => {
    const user = userEvent.setup();

    // Mobile navigation test
    setViewport(375, 667);

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    // Mobile menu should be collapsed initially
    const mobileMenuButton = screen.getByRole('button', { name: /menu/i });
    expect(mobileMenuButton).toBeInTheDocument();

    const navigation = screen.getByRole('navigation');
    expect(navigation).toHaveClass('hidden');

    // Open mobile menu
    await user.click(mobileMenuButton);
    
    await waitFor(() => {
      expect(navigation).not.toHaveClass('hidden');
    });

    // Navigation links should be stacked vertically on mobile
    const navLinks = screen.getAllByRole('link');
    const navContainer = navLinks[0]?.closest('[class*="flex"]');
    if (navContainer) {
      expect(navContainer).toHaveClass(/flex-col|space-y/);
    }

    // Desktop navigation test
    setViewport(1440, 900);
    fireEvent(window, new Event('resize'));

    // Mobile menu button should not be visible
    const desktopMobileButton = screen.queryByRole('button', { name: /menu/i });
    expect(desktopMobileButton).not.toBeInTheDocument();

    // Navigation should be always visible
    const desktopNavigation = screen.getByRole('navigation');
    expect(desktopNavigation).not.toHaveClass('hidden');

    // Navigation links should be horizontal on desktop
    const desktopNavLinks = screen.getAllByRole('link');
    const desktopNavContainer = desktopNavLinks[0]?.closest('[class*="flex"]');
    if (desktopNavContainer) {
      expect(desktopNavContainer).toHaveClass(/flex-row|space-x/);
    }
  });

  it('should handle data tables responsively', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    // Navigate to projects page (likely to have tables)
    const projectsLink = screen.getByRole('link', { name: /projects/i });
    await user.click(projectsLink);

    // Mobile table handling
    setViewport(375, 667);
    fireEvent(window, new Event('resize'));

    // Tables should be scrollable horizontally on mobile
    const tables = screen.getAllByRole('table');
    tables.forEach(table => {
      const tableContainer = table.closest('[class*="overflow"]');
      if (tableContainer) {
        expect(tableContainer).toHaveClass(/overflow-x-auto|overflow-scroll/);
      }
    });

    // Desktop table handling
    setViewport(1440, 900);
    fireEvent(window, new Event('resize'));

    // Tables should display fully on desktop
    const desktopTables = screen.getAllByRole('table');
    desktopTables.forEach(table => {
      expect(table).toHaveClass(/w-full/);
    });
  });
});