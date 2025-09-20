import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import App from "../../App";
import { AuthService } from "../../services/authService";
import { PlantService } from "../../services/plantService";
import * as ProjectService from "../../services/projectService";
import * as SimpleTaskService from "../../services/simpleTaskService";

// Mock types and enums
vi.mock("../../types", () => ({
  ErrorCode: {
    UNKNOWN_ERROR: "UNKNOWN_ERROR",
    AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
    AUTH_USER_NOT_FOUND: "AUTH_USER_NOT_FOUND",
    AUTH_WRONG_PASSWORD: "AUTH_WRONG_PASSWORD",
    AUTH_EMAIL_ALREADY_IN_USE: "AUTH_EMAIL_ALREADY_IN_USE",
    AUTH_WEAK_PASSWORD: "AUTH_WEAK_PASSWORD",
    AUTH_NETWORK_ERROR: "AUTH_NETWORK_ERROR",
    AUTH_TOO_MANY_REQUESTS: "AUTH_TOO_MANY_REQUESTS",
    DB_PERMISSION_DENIED: "DB_PERMISSION_DENIED",
    DB_NOT_FOUND: "DB_NOT_FOUND",
    DB_NETWORK_ERROR: "DB_NETWORK_ERROR",
    DB_QUOTA_EXCEEDED: "DB_QUOTA_EXCEEDED",
    DB_VALIDATION_ERROR: "DB_VALIDATION_ERROR",
    STORAGE_UNAUTHORIZED: "STORAGE_UNAUTHORIZED",
    STORAGE_QUOTA_EXCEEDED: "STORAGE_QUOTA_EXCEEDED",
    STORAGE_INVALID_FORMAT: "STORAGE_INVALID_FORMAT",
    STORAGE_FILE_TOO_LARGE: "STORAGE_FILE_TOO_LARGE",
    STORAGE_NETWORK_ERROR: "STORAGE_NETWORK_ERROR",
    CALENDAR_AUTH_ERROR: "CALENDAR_AUTH_ERROR",
    CALENDAR_QUOTA_EXCEEDED: "CALENDAR_QUOTA_EXCEEDED",
    CALENDAR_NETWORK_ERROR: "CALENDAR_NETWORK_ERROR",
    CALENDAR_INVALID_EVENT: "CALENDAR_INVALID_EVENT",
    VALIDATION_ERROR: "VALIDATION_ERROR",
    NETWORK_ERROR: "NETWORK_ERROR",
  },
}));

// Mock application services
vi.mock("../../services/authService", () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock("../../services/plantService", () => ({
  getUserPlants: vi.fn(),
  createPlant: vi.fn(),
  updatePlant: vi.fn(),
  deletePlant: vi.fn(),
  uploadPlantPhoto: vi.fn(),
}));

vi.mock("../../services/projectService", () => ({
  getUserProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  createSubtask: vi.fn(),
  updateSubtask: vi.fn(),
  deleteSubtask: vi.fn(),
}));

vi.mock("../../services/simpleTaskService", () => ({
  getUserTasks: vi.fn(),
  createSimpleTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

// Mock React Router for navigation testing
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Complete Application Workflow Integration Tests", () => {
  const mockUser = {
    uid: "test-user-123",
    email: "test@example.com",
    displayName: "Test User",
    createdAt: new Date(),
  };

  const mockPlant = {
    id: "plant-1",
    userId: "test-user-123",
    name: "Test Plant",
    species: "Test Species",
    description: "A test plant for integration testing",
    photos: [],
    careTasks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProject = {
    id: "project-1",
    userId: "test-user-123",
    title: "Test Project",
    description: "A test project for integration testing",
    status: "todo" as const,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    subtasks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTask = {
    id: "task-1",
    userId: "test-user-123",
    title: "Test Task",
    description: "A test task for integration testing",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock successful authentication
    vi.mocked(AuthService.getCurrentUser).mockResolvedValue(mockUser);
    vi.mocked(AuthService.login).mockResolvedValue(mockUser);
    vi.mocked(AuthService.logout).mockResolvedValue();

    // Mock plant service
    vi.mocked(PlantService.getUserPlants).mockResolvedValue([mockPlant]);
    vi.mocked(PlantService.createPlant).mockResolvedValue("plant-1");
    vi.mocked(PlantService.updatePlant).mockResolvedValue(undefined);
    vi.mocked(PlantService.deletePlant).mockResolvedValue();

    // Mock project service
    vi.mocked(ProjectService.getUserProjects).mockResolvedValue([mockProject]);
    vi.mocked(ProjectService.createProject).mockResolvedValue("project-1");
    vi.mocked(ProjectService.updateProject).mockResolvedValue(undefined);
    vi.mocked(ProjectService.deleteProject).mockResolvedValue();

    // Mock task service
    vi.mocked(SimpleTaskService.getUserSimpleTasks).mockResolvedValue([
      mockTask,
    ]);
    vi.mocked(SimpleTaskService.createSimpleTask).mockResolvedValue("task-1");
    vi.mocked(SimpleTaskService.updateSimpleTask).mockResolvedValue(undefined);
    vi.mocked(SimpleTaskService.deleteSimpleTask).mockResolvedValue();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should complete full user workflow from login to task management", async () => {
    const user = userEvent.setup();

    // Render the app
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText(/household management/i)).toBeInTheDocument();
    });

    // Should show dashboard after successful auth
    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    // Navigate to plants page
    const plantsLink = screen.getByRole("link", { name: /plant codex/i });
    await user.click(plantsLink);

    await waitFor(() => {
      expect(screen.getByText(/plant codex/i)).toBeInTheDocument();
    });

    // Navigate to projects page
    const projectsLink = screen.getByRole("link", { name: /projects/i });
    await user.click(projectsLink);

    await waitFor(() => {
      expect(screen.getByText(/project management/i)).toBeInTheDocument();
    });

    // Navigate to tasks page
    const tasksLink = screen.getByRole("link", { name: /tasks/i });
    await user.click(tasksLink);

    await waitFor(() => {
      expect(screen.getByText(/task management/i)).toBeInTheDocument();
    });

    // Navigate to calendar page
    const calendarLink = screen.getByRole("link", { name: /calendar/i });
    await user.click(calendarLink);

    await waitFor(() => {
      expect(screen.getByText(/calendar/i)).toBeInTheDocument();
    });
  });

  it("should handle plant creation workflow with photo upload", async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Wait for app to load and navigate to plants
    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    // Navigate to plants page
    const plantsLink = screen.getByRole("link", { name: /plant codex/i });
    await user.click(plantsLink);

    // Click add plant button
    const addPlantButton = screen.getByRole("button", { name: /add plant/i });
    await user.click(addPlantButton);

    // Fill out plant form
    const nameInput = screen.getByLabelText(/plant name/i);
    await user.type(nameInput, "New Test Plant");

    const speciesInput = screen.getByLabelText(/species/i);
    await user.type(speciesInput, "Testicus planticus");

    const descriptionInput = screen.getByLabelText(/description/i);
    await user.type(
      descriptionInput,
      "A beautiful test plant for our collection"
    );

    // Submit form
    const saveButton = screen.getByRole("button", { name: /save plant/i });
    await user.click(saveButton);

    // Verify plant service was called
    await waitFor(() => {
      expect(PlantService.createPlant).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Test Plant",
          species: "Testicus planticus",
          description: "A beautiful test plant for our collection",
        })
      );
    });
  });

  it("should handle responsive design across different screen sizes", async () => {
    // Test mobile viewport
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 667,
    });

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    // Check for mobile navigation (hamburger menu should be visible)
    const mobileMenuButton = screen.getByRole("button", { name: /menu/i });
    expect(mobileMenuButton).toBeInTheDocument();

    // Test tablet viewport
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 768,
    });

    // Trigger resize event
    fireEvent(window, new Event("resize"));

    // Test desktop viewport
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });

    // Trigger resize event
    fireEvent(window, new Event("resize"));

    // Desktop navigation should be visible
    const desktopNav = screen.getByRole("navigation");
    expect(desktopNav).toBeInTheDocument();
  });

  it("should handle error states and recovery", async () => {
    // Mock service errors
    vi.mocked(PlantService.getUserPlants).mockRejectedValue(
      new Error("Network error")
    );

    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Navigate to plants page
    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    });

    const plantsLink = screen.getByRole("link", { name: /plant codex/i });
    await user.click(plantsLink);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    // Test retry functionality
    const retryButton = screen.getByRole("button", { name: /retry/i });

    // Mock successful retry
    vi.mocked(PlantService.getUserPlants).mockResolvedValue([mockPlant]);

    await user.click(retryButton);

    // Should recover and show plants
    await waitFor(() => {
      expect(screen.getByText(/test plant/i)).toBeInTheDocument();
    });
  });

  it("should handle offline functionality", async () => {
    // Mock offline state
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: false,
    });

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Should show offline indicator
    await waitFor(() => {
      expect(screen.getByText(/offline/i)).toBeInTheDocument();
    });

    // Test offline data access
    const plantsLink = screen.getByRole("link", { name: /plant codex/i });
    await userEvent.click(plantsLink);

    // Should still show cached data or appropriate offline message
    await waitFor(() => {
      expect(screen.getByText(/plant codex/i)).toBeInTheDocument();
    });
  });
});
