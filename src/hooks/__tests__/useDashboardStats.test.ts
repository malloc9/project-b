import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardStats } from '../useDashboardStats';
import { useTasks } from '../useTasks';
import { useProjects } from '../useProjects';
import { addDays, getStartOfDay } from '../../utils/dateUtils';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the useTasks and useProjects hooks
vi.mock('../useTasks');
vi.mock('../useProjects');

const mockUseTasks = vi.mocked(useTasks);
const mockUseProjects = vi.mocked(useProjects);

describe('useDashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockToday = getStartOfDay(new Date('2025-01-15T12:00:00.000Z'));

  it('should return correct count for tasks and projects due this week', async () => {
    const mockTasks = [
      { id: '1', title: 'Task 1', dueDate: addDays(mockToday, 0).toISOString() }, // Today
      { id: '2', title: 'Task 2', dueDate: addDays(mockToday, 3).toISOString() }, // Within 7 days
      { id: '3', title: 'Task 3', dueDate: addDays(mockToday, 7).toISOString() }, // Beyond 7 days
      { id: '4', title: 'Task 4', dueDate: addDays(mockToday, -1).toISOString() }, // Past
      { id: '5', title: 'Task 5', dueDate: undefined }, // No due date
    ];

    const mockProjects = [
      { id: 'p1', title: 'Project 1', dueDate: addDays(mockToday, 1).toISOString() }, // Within 7 days
      { id: 'p2', title: 'Project 2', dueDate: addDays(mockToday, 6).toISOString() }, // Within 7 days (edge case)
      { id: 'p3', title: 'Project 3', dueDate: addDays(mockToday, 8).toISOString() }, // Beyond 7 days
    ];

    mockUseTasks.mockReturnValue({ 
      tasks: mockTasks, 
      loading: false, 
      error: null,
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      refreshTasks: vi.fn()
    });
    
    mockUseProjects.mockReturnValue({ 
      projects: mockProjects, 
      loading: false, 
      error: null,
      createProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      refreshProjects: vi.fn()
    });

    const { result } = renderHook(() => useDashboardStats());

    // Wait for the hook to process
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(null);
    expect(result.current.thisWeekCount).toBe(4); // Task 1, Task 2, Project 1, Project 2
  });

  it('should handle loading state correctly', async () => {
    mockUseTasks.mockReturnValue({ 
      tasks: [], 
      loading: true, 
      error: null,
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      refreshTasks: vi.fn()
    });
    
    mockUseProjects.mockReturnValue({ 
      projects: [], 
      loading: false, 
      error: null,
      createProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      refreshProjects: vi.fn()
    });

    const { result } = renderHook(() => useDashboardStats());

    expect(result.current.loading).toBe(true);
  });

  it('should handle error state from tasks hook', async () => {
    mockUseTasks.mockReturnValue({ 
      tasks: [], 
      loading: false, 
      error: 'Task error',
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      refreshTasks: vi.fn()
    });
    
    mockUseProjects.mockReturnValue({ 
      projects: [], 
      loading: false, 
      error: null,
      createProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      refreshProjects: vi.fn()
    });

    const { result } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load tasks: Task error');
  });

  it('should handle error state from projects hook', async () => {
    mockUseTasks.mockReturnValue({ 
      tasks: [], 
      loading: false, 
      error: null,
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      refreshTasks: vi.fn()
    });
    
    mockUseProjects.mockReturnValue({ 
      projects: [], 
      loading: false, 
      error: 'Project error',
      createProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      refreshProjects: vi.fn()
    });

    const { result } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load projects: Project error');
  });

  it('should return 0 when no tasks or projects are due this week', async () => {
    const mockTasks = [
      { id: '1', title: 'Task 1', dueDate: addDays(mockToday, 8).toISOString() },
      { id: '2', title: 'Task 2', dueDate: addDays(mockToday, -5).toISOString() },
    ];

    const mockProjects = [
      { id: 'p1', title: 'Project 1', dueDate: addDays(mockToday, 10).toISOString() },
    ];

    mockUseTasks.mockReturnValue({ 
      tasks: mockTasks, 
      loading: false, 
      error: null,
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      refreshTasks: vi.fn()
    });
    
    mockUseProjects.mockReturnValue({ 
      projects: mockProjects, 
      loading: false, 
      error: null,
      createProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      refreshProjects: vi.fn()
    });

    const { result } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(null);
    expect(result.current.thisWeekCount).toBe(0);
  });

  it('should correctly filter items with Date objects as dueDate', async () => {
    const mockTasks = [
      { id: '1', title: 'Task 1', dueDate: addDays(mockToday, 0) }, // Today
      { id: '2', title: 'Task 2', dueDate: addDays(mockToday, 7) }, // Beyond 7 days
    ];

    const mockProjects = [
      { id: 'p1', title: 'Project 1', dueDate: addDays(mockToday, 5) }, // Within 7 days
    ];

    mockUseTasks.mockReturnValue({ 
      tasks: mockTasks, 
      loading: false, 
      error: null,
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      refreshTasks: vi.fn()
    });
    
    mockUseProjects.mockReturnValue({ 
      projects: mockProjects, 
      loading: false, 
      error: null,
      createProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      refreshProjects: vi.fn()
    });

    const { result } = renderHook(() => useDashboardStats());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(null);
    expect(result.current.thisWeekCount).toBe(2); // Task 1, Project 1
  });
});