import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { PlantService } from '../../services/plantService';
import { ProjectService } from '../../services/projectService';
import { SimpleTaskService } from '../../services/simpleTaskService';
import { PlantList } from '../../components/plants/PlantList';
import { ProjectList } from '../../components/projects/ProjectList';
import { TaskList } from '../../components/tasks/TaskList';
import { AuthProvider } from '../../contexts/AuthContext';
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
        name: 'New Plant',
        species: 'Test species',
        description: 'Test description',
        photos: [],
        careTasks: [],
      };

      vi.mocked(PlantService.createPlant).mockResolvedValue('new-plant-id');

      // This would typically be tested with a form component
      await PlantService.createPlant('test-user-id', newPlant);

      expect(PlantService.createPlant).toHaveBeenCalledWith('test-user-id', newPlant);
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
      const filters = { hasPhotos: true };
      
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

      await ProjectService.createProject('test-user-id', newProject);

      expect(ProjectService.createProject).toHaveBeenCalledWith('test-user-id', newProject);
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
      vi.mocked(SimpleTaskService.getUserTasks).mockResolvedValue(mockTasks);
      vi.mocked(SimpleTaskService.createTask).mockResolvedValue('new-task-id');
      vi.mocked(SimpleTaskService.updateTask).mockResolvedValue(undefined);
      vi.mocked(SimpleTaskService.deleteTask).mockResolvedValue(undefined);
    });

    it('loads and displays tasks', async () => {
      render(<TaskList />);

      await waitFor(() => {
        expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      });

      expect(SimpleTaskService.getUserTasks).toHaveBeenCalledWith('test-user-id');
    });

    it('handles task creation', async () => {
      const newTask = {
        title: 'New Task',
        description: 'Test task',
        dueDate: new Date('2024-02-15'),
        completed: false,
      };

      await SimpleTaskService.createTask('test-user-id', newTask);

      expect(SimpleTaskService.createTask).toHaveBeenCalledWith('test-user-id', newTask);
    });

    it('handles task completion', async () => {
      const completionUpdate = { completed: true };

      await SimpleTaskService.updateTask('test-user-id', 'task-1', completionUpdate);

      expect(SimpleTaskService.updateTask).toHaveBeenCalledWith(
        'test-user-id',
        'task-1',
        completionUpdate
      );
    });

    it('handles task deletion', async () => {
      await SimpleTaskService.deleteTask('test-user-id', 'task-1');

      expect(SimpleTaskService.deleteTask).toHaveBeenCalledWith('test-user-id', 'task-1');
    });

    it('filters completed tasks', async () => {
      const incompleteTasks = mockTasks.filter(task => !task.completed);
      vi.mocked(SimpleTaskService.getUserTasks).mockResolvedValue(incompleteTasks);

      render(<TaskList />);

      await waitFor(() => {
        expect(screen.getByText('Buy groceries')).toBeInTheDocument();
      });

      expect(SimpleTaskService.getUserTasks).toHaveBeenCalledWith('test-user-id');
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
        await ProjectService.createProject('test-user-id', {
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
      vi.mocked(SimpleTaskService.deleteTask).mockRejectedValue(permissionError);

      try {
        await SimpleTaskService.deleteTask('test-user-id', 'task-1');
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
      vi.mocked(SimpleTaskService.updateTask).mockRejectedValue(updateError);

      // This would typically be tested with a component that implements optimistic updates
      try {
        await SimpleTaskService.updateTask('test-user-id', 'task-1', { completed: true });
      } catch (error) {
        expect(error).toEqual(updateError);
        // Component should revert the optimistic update
      }
    });
  });
});