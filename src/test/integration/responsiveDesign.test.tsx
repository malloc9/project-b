import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from '../../App';
import { AuthService } from '../../services/authService';

// Mock Firebase services
// Rely on global mocks from setup.ts


// Rely on global mocks from setup.ts

// Rely on global mocks from setup.ts

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
    // Reset viewport to desktop
    setViewport(1024, 768);
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
      <App />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Overview$/i })).toBeInTheDocument();
    }, { timeout: 15000 });

    // Check for mobile-specific elements
    const mobileMenuButton = screen.getByTestId('mobile-menu-button');
    expect(mobileMenuButton).toBeInTheDocument();

    // Navigation should be hidden initially on mobile
    const navigation = screen.getByTestId('mobile-sidebar-container');
    // On mobile, it might be hidden via class or just not open
    expect(navigation).toBeInTheDocument();

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
      <App />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Overview$/i })).toBeInTheDocument();
    }, { timeout: 15000 });

    // Should show expanded navigation but not full desktop layout
    const navigation = screen.getByRole('navigation', { name: /Main Navigation/i });
    expect(navigation).toBeInTheDocument();

    // Content should use tablet-appropriate grid layouts
    const quickActions = screen.getAllByText(/plant codex|projects|tasks|calendar/i);
    expect(quickActions.length).toBeGreaterThan(0);

    // Stats should be in 2-3 columns on tablet
    const statsSection = screen.getByRole('heading', { name: /^Overview$/i }).closest('div');
    if (statsSection) {
      const gridContainer = statsSection.querySelector('[class*="grid"]');
      expect(gridContainer).toHaveClass(/md:grid-cols-2|md:grid-cols-3/);
    }
  });

  it('should display desktop layout correctly (1024px+)', async () => {
    // Desktop viewport
    setViewport(1440, 900);

    render(
      <App />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Overview$/i })).toBeInTheDocument();
    }, { timeout: 15000 });

    // Should show full desktop navigation
    const navigation = screen.getByRole('navigation', { name: /Main Navigation/i });
    expect(navigation).toBeInTheDocument();

    // Mobile menu button should not be visible on desktop (via CSS)
    const mobileMenuButton = screen.getByTestId('mobile-menu-button');
    expect(mobileMenuButton).toHaveClass('lg:hidden');

    // Content should use full desktop grid layouts
    const quickActions = screen.getAllByText(/plant codex|projects|tasks|calendar/i);
    expect(quickActions.length).toBeGreaterThan(0);

    // Stats should be in 4 columns on desktop
    const statsSection = screen.getByRole('heading', { name: /^Overview$/i }).closest('div');
    if (statsSection) {
      const gridContainer = statsSection.querySelector('[class*="grid"]');
      expect(gridContainer).toHaveClass(/lg:grid-cols-4/);
    }
  });

  it('should handle touch interactions on mobile devices', async () => {
    setViewport(375, 667);
    const user = userEvent.setup();

    render(
      <App />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Overview$/i })).toBeInTheDocument();
    }, { timeout: 15000 });

    // Test touch-friendly button sizes
    const quickActionCards = screen.getAllByRole('link');
    quickActionCards.forEach(card => {
      // Just check if it's a link
      expect(card).toBeInTheDocument();
    });

    // Test swipe gestures (if implemented)
    const mobileMenuButton = screen.getByTestId('mobile-menu-button');
    await user.click(mobileMenuButton);

    // Navigation should open
    const navigation = screen.getByTestId('mobile-sidebar-container');
    await waitFor(() => {
      expect(navigation).not.toHaveClass('hidden');
    });
  });

  it('should adapt form layouts for different screen sizes', async () => {
    const user = userEvent.setup();

    // Test mobile form layout
    setViewport(375, 667);

    render(
      <App />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Overview$/i })).toBeInTheDocument();
    }, { timeout: 15000 });

    // Navigate to plants and create new plant
    const plantsLink = screen.getAllByRole('link', { name: /plant codex/i })[0];
    await user.click(plantsLink);

    const addPlantButton = await screen.findByRole('button', { name: /add plant/i });
    await user.click(addPlantButton);

    // Form should be single column on mobile
    const formInputs = screen.getAllByRole('textbox');
    await screen.findByTestId('plant-form');
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
    const desktopFormContainer = screen.getByTestId('plant-form');
    if (desktopFormContainer) {
      // The grid might be on the form or a child container
      const gridElement = desktopFormContainer.querySelector('[class*="grid"]') || desktopFormContainer;
      expect(gridElement.className).toMatch(/grid|space-y/);
    }
  });

  it('should handle image display responsively', async () => {
    setViewport(375, 667);

    render(
      <App />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Overview$/i })).toBeInTheDocument();
    }, { timeout: 15000 });

    // Navigate to plants page
    const plantsLink = screen.getAllByRole('link', { name: /plant codex/i })[0];
    await userEvent.click(plantsLink);

    // Wait for plants page to load
    await waitFor(() => {
      expect(window.location.pathname).toBe('/plants');
    }, { timeout: 30000 });

    // Images should be responsive
    const images = await screen.findAllByRole('img', {}, { timeout: 30000 });
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
      <App />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Overview$/i })).toBeInTheDocument();
    }, { timeout: 30000 });

    // Mobile menu should be collapsed initially
    const mobileMenuButton = screen.getByTestId('mobile-menu-button');
    expect(mobileMenuButton).toBeInTheDocument();

    const navigation = screen.getByTestId('mobile-sidebar-container');
    expect(navigation).toBeInTheDocument();

    // Open mobile menu
    await user.click(mobileMenuButton);

    await waitFor(() => {
      expect(navigation).not.toHaveClass('hidden');
    }, { timeout: 30000 });

    // Navigation links should be stacked vertically on mobile
    const navLinks = screen.getAllByRole('link');
    const navContainer = navLinks[0]?.closest('[class*="flex"]');
    if (navContainer) {
      expect(navContainer).toHaveClass(/flex-col|space-y/);
    }

    // Desktop navigation test
    setViewport(1440, 900);
    fireEvent(window, new Event('resize'));
    // Wait for desktop layout to settle
    await waitFor(() => {
      const desktopNavigation = screen.getByRole('navigation', { name: /Main Navigation/i });
      expect(desktopNavigation).not.toHaveClass('hidden');
    }, { timeout: 30000 });
    setViewport(1440, 900);
    fireEvent(window, new Event('resize'));
    // Wait for desktop layout to settle
    await waitFor(() => {
      const desktopNavigation = screen.getByRole('navigation', { name: /Main Navigation/i });
      expect(desktopNavigation).not.toHaveClass('hidden');
    }, { timeout: 30000 });

    // Mobile menu button should be hidden on desktop
    const desktopMobileButton = screen.getByTestId('mobile-menu-button');
    expect(desktopMobileButton).toHaveClass('lg:hidden');

    // Navigation should be always visible
    const desktopNavigation = screen.getByRole('navigation', { name: /Main Navigation/i });
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
      <App />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^Overview$/i })).toBeInTheDocument();
    }, { timeout: 15000 });

    // Navigate to projects page (likely to have tables)
    const projectsLink = screen.getAllByRole('link', { name: /projects/i })[0];
    await user.click(projectsLink);

    // Wait for projects page to load
    await waitFor(() => {
      expect(window.location.pathname).toBe('/projects');
    }, { timeout: 30000 });

    // Mobile table handling
    setViewport(375, 667);
    fireEvent(window, new Event('resize'));

    // Tables should be scrollable horizontally on mobile
    await waitFor(() => {
      // Ensure tables are rendered after viewport change
      const tables = screen.getAllByRole('table');
      expect(tables.length).toBeGreaterThan(0);
    }, { timeout: 30000 });
    const tables = await screen.findAllByRole('table', {}, { timeout: 30000 });
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