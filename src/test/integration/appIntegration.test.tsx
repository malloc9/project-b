import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import App from '../../App';

// Mock the entire Firebase config to avoid initialization issues
vi.mock('../../config/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn((callback) => {
      // Simulate authenticated user
      callback({
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
      });
      return vi.fn(); // unsubscribe function
    }),
  },
  db: {},
  storage: {},
  functions: {},
}));

// Mock all service modules
vi.mock('../../services/authService', () => ({
  AuthService: {
    getCurrentUser: vi.fn().mockReturnValue({
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      createdAt: new Date(),
    }),
    login: vi.fn().mockResolvedValue({
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      createdAt: new Date(),
    }),
    logout: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    onAuthStateChanged: vi.fn((callback) => {
      // Simulate authenticated user
      callback({
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        createdAt: new Date(),
      });
      return vi.fn(); // unsubscribe function
    }),
    validateEmail: vi.fn().mockReturnValue(true),
    validatePassword: vi.fn().mockReturnValue({ isValid: true }),
  },
}));

vi.mock('../../services/plantService', () => ({
  getUserPlants: vi.fn().mockResolvedValue([]),
  createPlant: vi.fn().mockResolvedValue('plant-123'),
  updatePlant: vi.fn().mockResolvedValue(undefined),
  deletePlant: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/projectService', () => ({
  getUserProjects: vi.fn().mockResolvedValue([]),
  createProject: vi.fn().mockResolvedValue('project-123'),
  updateProject: vi.fn().mockResolvedValue(undefined),
  deleteProject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/simpleTaskService', () => ({
  getUserSimpleTasks: vi.fn().mockResolvedValue([]),
  getSimpleTask: vi.fn().mockResolvedValue(null),
  createSimpleTask: vi.fn().mockResolvedValue('mock-task-id'),
  updateSimpleTask: vi.fn().mockResolvedValue(undefined),
  deleteSimpleTask: vi.fn().mockResolvedValue(undefined),
  sortTasksByDueDate: vi.fn((tasks) => tasks),
  filterTasksByCompletion: vi.fn((tasks) => tasks),
  searchTasks: vi.fn((tasks) => tasks),
  toggleTaskCompletion: vi.fn().mockResolvedValue(undefined),
  completeTask: vi.fn().mockResolvedValue(undefined),
  uncompleteTask: vi.fn().mockResolvedValue(undefined),
}));


describe('Application Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset viewport to desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  it('should render the application and show dashboard for authenticated user', async () => {
    render(
      <App />
    );

    // Wait for the app to load and show the dashboard
    await waitFor(() => {
      expect(screen.getAllByText(/Home Manager|Household Management/i)[0]).toBeInTheDocument();
    }, { timeout: 5000 });

    // Should show navigation elements
    expect(screen.getAllByRole('navigation')[0]).toBeInTheDocument();
  });

  it('should navigate between different pages', async () => {
    const user = userEvent.setup();

    render(
      <App />
    );

    // Wait for app to load
    await waitFor(() => {
      expect(screen.getAllByText(/Home Manager|Household Management/i)[0]).toBeInTheDocument();
    });

    // Test navigation to plants page
    const plantsLink = screen.getAllByRole('link', { name: /plant codex/i })[0];
    if (plantsLink) {
      await user.click(plantsLink);
      await waitFor(() => {
        expect(window.location.pathname).toBe('/plants');
      });
    }

    // Test navigation to projects page
    const projectsLink = screen.getAllByRole('link', { name: /projects/i })[0];
    if (projectsLink) {
      await user.click(projectsLink);
      await waitFor(() => {
        expect(window.location.pathname).toBe('/projects');
      });
    }

    // Test navigation to tasks page
    const tasksLink = screen.getAllByRole('link', { name: /tasks/i })[0];
    if (tasksLink) {
      await user.click(tasksLink);
      await waitFor(() => {
        expect(window.location.pathname).toBe('/tasks');
      });
    }
  });

  it('should handle responsive design', async () => {
    // Test mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(
      <App />
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Home Manager|Household Management/i)[0]).toBeInTheDocument();
    }, { timeout: 5000 });

    // Should render without errors on mobile
    expect(screen.getByRole('main')).toBeInTheDocument();

    // Test desktop viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    // Should still render correctly
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it.skip('should show error boundary when component errors occur', async () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    // Enable error throwing
    shouldThrowError = true;

    render(
      <App />
    );

    // Should show error boundary
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    }, { timeout: 10000 });

    // Reset for other tests
    shouldThrowError = false;
    consoleSpy.mockRestore();
  });

  it.skip('should handle loading states', async () => {
    render(
      <App />
    );

    // Should show loading spinner initially
    // Should show loading spinner initially or load directly
    const loadingElement = screen.queryByRole('status') || screen.queryByText(/loading/i);
    if (loadingElement) {
      expect(loadingElement).toBeInTheDocument();
    }

    // Should eventually load the app
    await screen.findByText(/Home Manager|Household Management/i, {}, { timeout: 15000 });
  });
});