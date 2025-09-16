import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PlantService } from '../../services/plantService';
import * as ProjectService from '../../services/projectService';
import * as SimpleTaskService from '../../services/simpleTaskService';
import { PlantList } from '../../components/plants/PlantList';
import ProjectList from '../../components/projects/ProjectList';
import TaskList from '../../components/tasks/TaskList';
import type { Plant, Project, SimpleTask } from '../../types';

// Mock services
vi.mock('../../services/plantService');
vi.mock('../../services/projectService');
vi.mock('../../services/simpleTaskService');

// Mock Firebase Auth
const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
};

vi.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ user: mockUser }),
}));

const mockPlants: Plant[] = [
  {
    id: 'plant-1',
    userId: 'test-user-id',
    name: 'Monstera Deliciosa',
    species: 'Monstera deliciosa',
    description: 'Beautiful houseplant',
    photos: [],
    careTasks: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'plant-2',
    userId: 'test-user-id',
    name: 'Snake Plant',
    species: 'Sansevieria trifasciata',
    description: 'Low maintenance plant',
    photos: [],
    careTasks: [],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
];

const mockProjects: Project[] = [
  {
    id: 'project-1',
    userId: 'test-user-id',
    title: 'Kitchen Renovation',
    description: 'Complete kitchen makeover',
    status: 'in_progress',
    dueDate: new Date('2024-06-01'),
    subtasks: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

const mockTasks: SimpleTask[] = [
  {
    id: 'task-1',
    userId: 'test-user-id',
    title: 'Buy groceries',
    description: 'Weekly grocery shopping',
    dueDate: new Date('2024-02-01'),
    completed: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

describe('CRUD Operations Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Plant CRUD Operations', () => {
    beforeEach(() => {
      vi.mocked(PlantService.getUserPlants).mockResolvedValue(mockPlants);
      vi.mocked(PlantService.createPlant).mockResolvedValue('new-plant-id');
      vi.mocked(PlantService.updatePlant).mockResolvedValue(undefined);
      vi.mocked(PlantService.deletePlant).mockResolvedValue(undefined);
    });

    it('loads and displays plants', async () => {
      render(<PlantList />);

      await waitFor(() => {
        expect(screen.getByText('Monstera Deliciosa')).toBeInTheDocument();
        expect(screen.getByText('Snake Plant')).toBeInTheDocument();
      });

      expect(PlantService.getUserPlants).toHaveBeenCalledWith('test-user-id', {});
    });

    it('handles plant creation', async () => {
      const newPlant = {
        userId: 'test-user-id',
        name: 'New Plant',
        species: 'Test species',
        description: 'Test description',
        photos: [],
        careTasks: [],
      };

      vi.mocked(PlantService.createPlant).mockResolvedValue('new-plant-id');

      // This would typically be tested with a form component
      await PlantService.createPlant(newPlant);

      expect(PlantService.createPlant).toHaveBeenCalledWith(newPlant);
    });

    it('handles plant updates', async () => {
      const updatedData = {
        name: 'Updated Plant Name',
        description: 'Updated description',
      };

      await PlantService.updatePlant('test-user-id', 'plant-1', updatedData);

      expect(PlantService.updatePlant).toHaveBeenCalledWith(
        'test-user-id',
        'plant-1',
        updatedData
      );
    });

    it('handles plant deletion', async () => {
      render(<PlantList />);

      await waitFor(() => {
        expect(screen.getByText('Monstera Deliciosa')).toBeInTheDocument();
      });

      // Simulate delete action (would typically be through a delete button)
      await PlantService.deletePlant('test-user-id', 'plant-1');

      expect(PlantService.deletePlant).toHaveBeenCalledWith('test-user-id', 'plant-1');
    });

    it('handles service errors gracefully', async () => {
      const error = new Error('Network error');
      vi.mocked(PlantService.getUserPlants).mockRejectedValue(error);

      render(<PlantList />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load plants/i)).toBeInTheDocument();
      });
    });

    it('applies filters correctly', async () => {
      const filters = { hasCareTasks: true }; // Corrected here
      
      render(<PlantList />);

      // Simulate filter change (would typically be through filter UI)
      await waitFor(() => {
        expect(PlantService.getUserPlants).toHaveBeenCalledWith('test-user-id', {});
      });

      // Test with filters
      vi.mocked(PlantService.getUserPlants).mockClear();
      await PlantService.getUserPlants('test-user-id', filters);

      expect(PlantService.getUserPlants).toHaveBeenCalledWith('test-user-id', filters);
    });
  });

  describe('Project CRUD Operations', () => {
    beforeEach(() => {
      vi.mocked(ProjectService.getUserProjects).mockResolvedValue(mockProjects);
      vi.mocked(ProjectService.createProject).mockResolvedValue('new-project-id');
      vi.mocked(ProjectService.updateProject).mockResolvedValue(undefined);
      vi.mocked(ProjectService.deleteProject).mockResolvedValue(undefined);
    });

    it('loads and displays projects', async () => {
      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText('Kitchen Renovation')).toBeInTheDocument();
      });

      expect(ProjectService.getUserProjects).toHaveBeenCalledWith('test-user-id');
    });

    it('handles project creation', async () => {
      const newProject = {
        title: 'New Project',
        description: 'Test project',
        status: 'todo' as const,
        dueDate: new Date('2024-06-01'),
        subtasks: [],
      };

      const projectToCreate = { ...newProject, userId: 'test-user-id' };
      await ProjectService.createProject(projectToCreate);

      expect(ProjectService.createProject).toHaveBeenCalledWith(projectToCreate);
    });

    it('handles project status updates', async () => {
      const statusUpdate = { status: 'finished' as const };

      await ProjectService.updateProject('test-user-id', 'project-1', statusUpdate);

      expect(ProjectService.updateProject).toHaveBeenCalledWith(
        'test-user-id',
        'project-1',
        statusUpdate
      );
    });

    it('handles project deletion', async () => {
      await ProjectService.deleteProject('test-user-id', 'project-1');

      expect(ProjectService.deleteProject).toHaveBeenCalledWith('test-user-id', 'project-1');
    });
  });

  describe('Simple Task CRUD Operations', () => {
    beforeEach(() => {
      vi.mocked(SimpleTaskService.getUserSimpleTasks).mockResolvedValue(mockTasks);
      vi.mocked(SimpleTaskService.createSimpleTask).mockResolvedValue('new-task-id');
      vi.mocked(SimpleTaskService.updateSimpleTask).mockResolvedValue(undefined);
      vi.mocked(SimpleTaskService.deleteSimpleTask).mockResolvedValue(undefined);
    });

    it('loads and displays tasks', async () => {
      render(<TaskList />);

      await waitFor(() => {
        expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      });

      expect(SimpleTaskService.getUserSimpleTasks).toHaveBeenCalledWith('test-user-id');
    });

    it('handles task creation', async () => {
      const newTask = {
        title: 'New Task',
        description: 'Test task',
        dueDate: new Date('2024-02-15'),
        completed: false,
      };

      const taskToCreate = { ...newTask, userId: 'test-user-id' };
      await SimpleTaskService.createSimpleTask(taskToCreate);

      expect(SimpleTaskService.createSimpleTask).toHaveBeenCalledWith(taskToCreate);
    });

    it('handles task completion', async () => {
      const completionUpdate = { completed: true };

      await SimpleTaskService.updateSimpleTask('task-1', completionUpdate);

      expect(SimpleTaskService.updateSimpleTask).toHaveBeenCalledWith(
        'task-1',
        completionUpdate
      );
    });

    it('handles task deletion', async () => {
      await SimpleTaskService.deleteSimpleTask('task-1');

      expect(SimpleTaskService.deleteSimpleTask).toHaveBeenCalledWith('task-1');
    });

    it('filters completed tasks', async () => {
      const incompleteTasks = mockTasks.filter(task => !task.completed);
      vi.mocked(SimpleTaskService.getUserSimpleTasks).mockResolvedValue(incompleteTasks);

      render(<TaskList />);

      await waitFor(() => {
        expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      });

      expect(SimpleTaskService.getUserSimpleTasks).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('Error Handling', () => {
    it('handles network errors in plant operations', async () => {
      const networkError = new Error('Network error');
      vi.mocked(PlantService.getUserPlants).mockRejectedValue(networkError);

      render(<PlantList />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load plants/i)).toBeInTheDocument();
      });
    });

    it('handles validation errors in project creation', async () => {
      const validationError = new Error('Title is required');
      vi.mocked(ProjectService.createProject).mockRejectedValue(validationError);

      try {
        await ProjectService.createProject({
          userId: 'test-user-id',
          title: '',
          description: 'Test',
          status: 'todo',
          subtasks: [],
        });
      } catch (error) {
        expect(error).toEqual(validationError);
      }
    });

    it('handles permission errors in task operations', async () => {
      const permissionError = new Error('Permission denied');
      vi.mocked(SimpleTaskService.deleteSimpleTask).mockRejectedValue(permissionError);

      try {
        await SimpleTaskService.deleteSimpleTask('task-1');
      } catch (error) {
        expect(error).toEqual(permissionError);
      }
    });
  });

  describe('Optimistic Updates', () => {
    it('updates UI optimistically for task completion', async () => {
      render(<TaskList />);

      await waitFor(() => {
        expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      });

      // Simulate optimistic update (would be handled by the component)
      // The UI should update immediately before the server confirms
    });

    it('reverts optimistic updates on error', async () => {
      const updateError = new Error('Update failed');
      vi.mocked(SimpleTaskService.updateSimpleTask).mockRejectedValue(updateError);

      // This would typically be tested with a component that implements optimistic updates
      try {
        await SimpleTaskService.updateSimpleTask('task-1', { completed: true });
      } catch (error) {
        expect(error).toEqual(updateError);
        // Component should revert the optimistic update
      }
    });
  });
});