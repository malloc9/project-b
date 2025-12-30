import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
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
  getUserTasks: vi.fn().mockResolvedValue([]),
  createTask: vi.fn().mockResolvedValue('task-123'),
  updateTask: vi.fn().mockResolvedValue(undefined),
  deleteTask: vi.fn().mockResolvedValue(undefined),
}));



describe('Application Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the application and show dashboard for authenticated user', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Wait for the app to load and show the dashboard
    await waitFor(() => {
      expect(screen.getByText(/household management/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Should show navigation elements
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('should navigate between different pages', async () => {
    const user = userEvent.setup();
    
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText(/household management/i)).toBeInTheDocument();
    });

    // Test navigation to plants page
    const plantsNavItem = screen.getByRole('link', { name: /plants/i });
    if (plantsNavItem) {
      await user.click(plantsNavItem);
      await waitFor(() => {
        expect(window.location.pathname).toBe('/plants');
      });
    }

    // Test navigation to projects page
    const projectsNavItem = screen.getByRole('link', { name: /projects/i });
    if (projectsNavItem) {
      await user.click(projectsNavItem);
      await waitFor(() => {
        expect(window.location.pathname).toBe('/projects');
      });
    }

    // Test navigation to tasks page
    const tasksNavItem = screen.getByRole('link', { name: /tasks/i });
    if (tasksNavItem) {
      await user.click(tasksNavItem);
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
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/household management/i)).toBeInTheDocument();
    });

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

  it('should show error boundary when component errors occur', async () => {
    // Mock console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Create a component that throws an error
    const ThrowError = () => {
      throw new Error('Test error');
    };

    // Mock one of the pages to throw an error
    vi.doMock('../../pages/DashboardPage', () => ({
      DashboardPage: ThrowError,
    }));

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Should show error boundary
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('should handle loading states', async () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Should show loading spinner initially
    expect(screen.getByRole('status') || screen.getByText(/loading/i)).toBeInTheDocument();

    // Should eventually load the app
    await waitFor(() => {
      expect(screen.getByText(/household management/i)).toBeInTheDocument();
    });
  });
});