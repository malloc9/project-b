import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Project, Subtask, TaskStatus } from '../../types';

// Mock Firebase
vi.mock('../../config/firebase', () => ({
  db: {}
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  writeBatch: vi.fn(),
  Timestamp: {
    fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
    now: vi.fn(() => ({ toDate: () => new Date() }))
  }
}));

// Import the service after mocking
import {
  createProject,
  getProject,
  getUserProjects,
  updateProject,
  deleteProject,
  createSubtask,
  getSubtask,
  getProjectSubtasks,
  updateSubtask,
  deleteSubtask,
  calculateProjectProgress,
  shouldAutoCompleteProject,
  filterProjectsByStatus,
  filterProjectsByDueDate,
  searchProjects
} from '../projectService';

// Import mocked functions
import {
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp
} from 'firebase/firestore';

describe('Project Service', () => {
  const mockUserId = 'test-user-id';
  const mockProjectId = 'test-project-id';
  const mockSubtaskId = 'test-subtask-id';

  const mockProject: Project = {
    id: mockProjectId,
    userId: mockUserId,
    title: 'Test Project',
    description: 'Test project description',
    status: 'todo',
    dueDate: new Date('2024-12-31'),
    subtasks: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockSubtask: Subtask = {
    id: mockSubtaskId,
    projectId: mockProjectId,
    title: 'Test Subtask',
    description: 'Test subtask description',
    status: 'todo',
    dueDate: new Date('2024-12-15'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (Timestamp.fromDate as any).mockImplementation((date: Date) => ({
      toDate: () => date
    }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Project CRUD Operations', () => {
    describe('createProject', () => {
      it('should create a project successfully', async () => {
        const mockDocRef = { id: mockProjectId };
        (addDoc as any).mockResolvedValue(mockDocRef);

        const projectData = {
          userId: mockUserId,
          title: 'New Project',
          description: 'New project description',
          status: 'todo' as TaskStatus,
          subtasks: []
        };

        const result = await createProject(projectData);

        expect(result).toBe(mockProjectId);
        expect(addDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            ...projectData,
            createdAt: expect.anything(),
            updatedAt: expect.anything()
          })
        );
      });

      it('should throw error when creation fails', async () => {
        (addDoc as any).mockRejectedValue(new Error('Firestore error'));

        const projectData = {
          userId: mockUserId,
          title: 'New Project',
          description: 'New project description',
          status: 'todo' as TaskStatus,
          subtasks: []
        };

        await expect(createProject(projectData)).rejects.toThrow();
      });
    });

    describe('getProject', () => {
      it('should get a project successfully', async () => {
        const mockDocSnap = {
          exists: () => true,
          id: mockProjectId,
          data: () => ({
            ...mockProject,
            createdAt: { toDate: () => mockProject.createdAt },
            updatedAt: { toDate: () => mockProject.updatedAt },
            dueDate: { toDate: () => mockProject.dueDate }
          })
        };
        (getDoc as any).mockResolvedValue(mockDocSnap);

        const result = await getProject(mockProjectId);

        expect(result).toEqual(mockProject);
        expect(getDoc).toHaveBeenCalled();
      });

      it('should return null when project does not exist', async () => {
        const mockDocSnap = {
          exists: () => false
        };
        (getDoc as any).mockResolvedValue(mockDocSnap);

        const result = await getProject(mockProjectId);

        expect(result).toBeNull();
      });

      it('should throw error when get fails', async () => {
        (getDoc as any).mockRejectedValue(new Error('Firestore error'));

        await expect(getProject(mockProjectId)).rejects.toThrow();
      });
    });

    describe('getUserProjects', () => {
      it('should get user projects successfully', async () => {
        const mockQuerySnapshot = {
          forEach: vi.fn((callback) => {
            callback({
              id: mockProjectId,
              data: () => ({
                ...mockProject,
                createdAt: { toDate: () => mockProject.createdAt },
                updatedAt: { toDate: () => mockProject.updatedAt },
                dueDate: { toDate: () => mockProject.dueDate }
              })
            });
          })
        };
        (getDocs as any).mockResolvedValue(mockQuerySnapshot);

        const result = await getUserProjects(mockUserId);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockProject);
      });

      it('should throw error when get fails', async () => {
        (getDocs as any).mockRejectedValue(new Error('Firestore error'));

        await expect(getUserProjects(mockUserId)).rejects.toThrow();
      });
    });

    describe('updateProject', () => {
      it('should update a project successfully', async () => {
        (updateDoc as any).mockResolvedValue(undefined);

        const updates = { title: 'Updated Project' };
        await updateProject(mockProjectId, updates);

        expect(updateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            ...updates,
            updatedAt: expect.anything()
          })
        );
      });

      it('should handle date conversion in updates', async () => {
        (updateDoc as any).mockResolvedValue(undefined);

        const updates = { dueDate: new Date('2024-12-31') };
        await updateProject(mockProjectId, updates);

        expect(updateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            dueDate: expect.anything(),
            updatedAt: expect.anything()
          })
        );
      });

      it('should throw error when update fails', async () => {
        (updateDoc as any).mockRejectedValue(new Error('Firestore error'));

        await expect(updateProject(mockProjectId, {})).rejects.toThrow();
      });
    });

    describe('deleteProject', () => {
      it('should delete a project and its subtasks successfully', async () => {
        const mockBatch = {
          delete: vi.fn(),
          commit: vi.fn().mockResolvedValue(undefined)
        };
        (writeBatch as any).mockReturnValue(mockBatch);

        const mockQuerySnapshot = {
          forEach: vi.fn((callback) => {
            callback({ ref: 'subtask-ref' });
          })
        };
        (getDocs as any).mockResolvedValue(mockQuerySnapshot);

        await deleteProject(mockProjectId);

        expect(mockBatch.delete).toHaveBeenCalledTimes(2); // Project + 1 subtask
        expect(mockBatch.commit).toHaveBeenCalled();
      });

      it('should throw error when delete fails', async () => {
        const mockBatch = {
          delete: vi.fn(),
          commit: vi.fn().mockRejectedValue(new Error('Firestore error'))
        };
        (writeBatch as any).mockReturnValue(mockBatch);
        (getDocs as any).mockResolvedValue({ forEach: vi.fn() });

        await expect(deleteProject(mockProjectId)).rejects.toThrow();
      });
    });
  });

  describe('Subtask CRUD Operations', () => {
    describe('createSubtask', () => {
      it('should create a subtask successfully', async () => {
        const mockDocRef = { id: mockSubtaskId };
        (addDoc as any).mockResolvedValue(mockDocRef);

        const subtaskData = {
          projectId: mockProjectId,
          title: 'New Subtask',
          description: 'New subtask description',
          status: 'todo' as TaskStatus,
          dueDate: new Date('2024-12-15')
        };

        const result = await createSubtask(subtaskData);

        expect(result).toBe(mockSubtaskId);
        expect(addDoc).toHaveBeenCalled();
      });

      it('should throw error when creation fails', async () => {
        (addDoc as any).mockRejectedValue(new Error('Firestore error'));

        const subtaskData = {
          projectId: mockProjectId,
          title: 'New Subtask',
          status: 'todo' as TaskStatus
        };

        await expect(createSubtask(subtaskData)).rejects.toThrow();
      });
    });

    describe('getSubtask', () => {
      it('should get a subtask successfully', async () => {
        const mockDocSnap = {
          exists: () => true,
          id: mockSubtaskId,
          data: () => ({
            ...mockSubtask,
            createdAt: { toDate: () => mockSubtask.createdAt },
            updatedAt: { toDate: () => mockSubtask.updatedAt },
            dueDate: { toDate: () => mockSubtask.dueDate }
          })
        };
        (getDoc as any).mockResolvedValue(mockDocSnap);

        const result = await getSubtask(mockSubtaskId);

        expect(result).toEqual(mockSubtask);
      });

      it('should return null when subtask does not exist', async () => {
        const mockDocSnap = {
          exists: () => false
        };
        (getDoc as any).mockResolvedValue(mockDocSnap);

        const result = await getSubtask(mockSubtaskId);

        expect(result).toBeNull();
      });
    });

    describe('getProjectSubtasks', () => {
      it('should get project subtasks successfully', async () => {
        const mockQuerySnapshot = {
          forEach: vi.fn((callback) => {
            callback({
              id: mockSubtaskId,
              data: () => ({
                ...mockSubtask,
                createdAt: { toDate: () => mockSubtask.createdAt },
                updatedAt: { toDate: () => mockSubtask.updatedAt },
                dueDate: { toDate: () => mockSubtask.dueDate }
              })
            });
          })
        };
        (getDocs as any).mockResolvedValue(mockQuerySnapshot);

        const result = await getProjectSubtasks(mockProjectId);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockSubtask);
      });
    });

    describe('updateSubtask', () => {
      it('should update a subtask successfully', async () => {
        (updateDoc as any).mockResolvedValue(undefined);

        const updates = { title: 'Updated Subtask' };
        await updateSubtask(mockSubtaskId, updates);

        expect(updateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            ...updates,
            updatedAt: expect.anything()
          })
        );
      });
    });

    describe('deleteSubtask', () => {
      it('should delete a subtask successfully', async () => {
        (deleteDoc as any).mockResolvedValue(undefined);

        await deleteSubtask(mockSubtaskId);

        expect(deleteDoc).toHaveBeenCalled();
      });
    });
  });

  describe('Utility Functions', () => {
    describe('calculateProjectProgress', () => {
      it('should calculate progress correctly', () => {
        const subtasks: Subtask[] = [
          { ...mockSubtask, id: '1', status: 'finished' },
          { ...mockSubtask, id: '2', status: 'finished' },
          { ...mockSubtask, id: '3', status: 'todo' },
          { ...mockSubtask, id: '4', status: 'in_progress' }
        ];

        const progress = calculateProjectProgress(subtasks);
        expect(progress).toBe(50); // 2 out of 4 completed = 50%
      });

      it('should return 0 for empty subtasks', () => {
        const progress = calculateProjectProgress([]);
        expect(progress).toBe(0);
      });
    });

    describe('shouldAutoCompleteProject', () => {
      it('should return true when all subtasks are finished', () => {
        const subtasks: Subtask[] = [
          { ...mockSubtask, id: '1', status: 'finished' },
          { ...mockSubtask, id: '2', status: 'finished' }
        ];

        const result = shouldAutoCompleteProject(subtasks);
        expect(result).toBe(true);
      });

      it('should return false when not all subtasks are finished', () => {
        const subtasks: Subtask[] = [
          { ...mockSubtask, id: '1', status: 'finished' },
          { ...mockSubtask, id: '2', status: 'todo' }
        ];

        const result = shouldAutoCompleteProject(subtasks);
        expect(result).toBe(false);
      });

      it('should return false for empty subtasks', () => {
        const result = shouldAutoCompleteProject([]);
        expect(result).toBe(false);
      });
    });

    describe('filterProjectsByStatus', () => {
      it('should filter projects by status', () => {
        const projects: Project[] = [
          { ...mockProject, id: '1', status: 'todo' },
          { ...mockProject, id: '2', status: 'finished' },
          { ...mockProject, id: '3', status: 'in_progress' }
        ];

        const result = filterProjectsByStatus(projects, 'todo');
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('todo');
      });

      it('should return all projects when no status filter', () => {
        const projects: Project[] = [
          { ...mockProject, id: '1', status: 'todo' },
          { ...mockProject, id: '2', status: 'finished' }
        ];

        const result = filterProjectsByStatus(projects);
        expect(result).toHaveLength(2);
      });
    });

    describe('filterProjectsByDueDate', () => {
      it('should filter projects by due date range', () => {
        const projects: Project[] = [
          { ...mockProject, id: '1', dueDate: new Date('2024-01-15') },
          { ...mockProject, id: '2', dueDate: new Date('2024-02-15') },
          { ...mockProject, id: '3', dueDate: new Date('2024-03-15') }
        ];

        const result = filterProjectsByDueDate(
          projects,
          new Date('2024-02-01'),
          new Date('2024-02-28')
        );

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
      });

      it('should exclude projects without due dates', () => {
        const projects: Project[] = [
          { ...mockProject, id: '1', dueDate: new Date('2024-01-15') },
          { ...mockProject, id: '2', dueDate: undefined }
        ];

        const result = filterProjectsByDueDate(projects, new Date('2024-01-01'));
        expect(result).toHaveLength(1);
      });
    });

    describe('searchProjects', () => {
      it('should search projects by title', () => {
        const projects: Project[] = [
          { ...mockProject, id: '1', title: 'Kitchen Renovation' },
          { ...mockProject, id: '2', title: 'Garden Project' },
          { ...mockProject, id: '3', title: 'Bathroom Update' }
        ];

        const result = searchProjects(projects, 'kitchen');
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Kitchen Renovation');
      });

      it('should search projects by description', () => {
        const projects: Project[] = [
          { ...mockProject, id: '1', description: 'Renovate the kitchen' },
          { ...mockProject, id: '2', description: 'Plant new flowers' }
        ];

        const result = searchProjects(projects, 'flowers');
        expect(result).toHaveLength(1);
        expect(result[0].description).toBe('Plant new flowers');
      });

      it('should return all projects for empty search term', () => {
        const projects: Project[] = [
          { ...mockProject, id: '1' },
          { ...mockProject, id: '2' }
        ];

        const result = searchProjects(projects, '');
        expect(result).toHaveLength(2);
      });
    });
  });
});