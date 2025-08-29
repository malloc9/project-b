import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SimpleTask } from '../../types';

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
  Timestamp: {
    fromDate: vi.fn((date: Date) => ({ toDate: () => date })),
    now: vi.fn(() => ({ toDate: () => new Date() }))
  }
}));

// Import the service after mocking
import {
  createSimpleTask,
  getSimpleTask,
  getUserSimpleTasks,
  updateSimpleTask,
  deleteSimpleTask,
  filterTasksByCompletion,
  filterTasksByDueDate,
  searchTasks,
  sortTasksByDueDate,
  sortTasksByCreatedDate,
  getTasksDueSoon,
  getOverdueTasks,
  getTaskStatistics,
  completeTask,
  uncompleteTask,
  toggleTaskCompletion,
  bulkUpdateTasks,
  bulkCompleteTasks,
  bulkDeleteTasks,
  getFilteredAndSortedTasks
} from '../simpleTaskService';

// Import mocked functions
import {
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';

describe('Simple Task Service', () => {
  const mockUserId = 'test-user-id';
  const mockTaskId = 'test-task-id';

  const mockTask: SimpleTask = {
    id: mockTaskId,
    userId: mockUserId,
    title: 'Test Task',
    description: 'Test task description',
    dueDate: new Date('2024-12-31'),
    completed: false,
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

  describe('CRUD Operations', () => {
    describe('createSimpleTask', () => {
      it('should create a task successfully', async () => {
        const mockDocRef = { id: mockTaskId };
        (addDoc as any).mockResolvedValue(mockDocRef);

        const taskData = {
          userId: mockUserId,
          title: 'New Task',
          description: 'New task description',
          dueDate: new Date('2024-12-31'),
          completed: false
        };

        const result = await createSimpleTask(taskData);

        expect(result).toBe(mockTaskId);
        expect(addDoc).toHaveBeenCalledTimes(1);
      });

      it('should create a task without due date', async () => {
        const mockDocRef = { id: mockTaskId };
        (addDoc as any).mockResolvedValue(mockDocRef);

        const taskData = {
          userId: mockUserId,
          title: 'New Task',
          completed: false
        };

        const result = await createSimpleTask(taskData);

        expect(result).toBe(mockTaskId);
        expect(addDoc).toHaveBeenCalledTimes(1);
      });

      it('should throw error when creation fails', async () => {
        (addDoc as any).mockRejectedValue(new Error('Firestore error'));

        const taskData = {
          userId: mockUserId,
          title: 'New Task',
          completed: false
        };

        await expect(createSimpleTask(taskData)).rejects.toThrow();
      });
    });

    describe('getSimpleTask', () => {
      it('should get a task successfully', async () => {
        const mockDocSnap = {
          exists: () => true,
          id: mockTaskId,
          data: () => ({
            ...mockTask,
            createdAt: { toDate: () => mockTask.createdAt },
            updatedAt: { toDate: () => mockTask.updatedAt },
            dueDate: { toDate: () => mockTask.dueDate }
          })
        };
        (getDoc as any).mockResolvedValue(mockDocSnap);

        const result = await getSimpleTask(mockTaskId);

        expect(result).toEqual(mockTask);
        expect(getDoc).toHaveBeenCalled();
      });

      it('should return null when task does not exist', async () => {
        const mockDocSnap = {
          exists: () => false
        };
        (getDoc as any).mockResolvedValue(mockDocSnap);

        const result = await getSimpleTask(mockTaskId);

        expect(result).toBeNull();
      });

      it('should handle task without due date', async () => {
        const taskWithoutDueDate = { ...mockTask, dueDate: undefined };
        const mockDocSnap = {
          exists: () => true,
          id: mockTaskId,
          data: () => ({
            ...taskWithoutDueDate,
            createdAt: { toDate: () => taskWithoutDueDate.createdAt },
            updatedAt: { toDate: () => taskWithoutDueDate.updatedAt },
            dueDate: null
          })
        };
        (getDoc as any).mockResolvedValue(mockDocSnap);

        const result = await getSimpleTask(mockTaskId);

        expect(result).toEqual(taskWithoutDueDate);
      });

      it('should throw error when get fails', async () => {
        (getDoc as any).mockRejectedValue(new Error('Firestore error'));

        await expect(getSimpleTask(mockTaskId)).rejects.toThrow();
      });
    });

    describe('getUserSimpleTasks', () => {
      it('should get user tasks successfully', async () => {
        const mockQuerySnapshot = {
          forEach: vi.fn((callback) => {
            callback({
              id: mockTaskId,
              data: () => ({
                ...mockTask,
                createdAt: { toDate: () => mockTask.createdAt },
                updatedAt: { toDate: () => mockTask.updatedAt },
                dueDate: { toDate: () => mockTask.dueDate }
              })
            });
          })
        };
        (getDocs as any).mockResolvedValue(mockQuerySnapshot);

        const result = await getUserSimpleTasks(mockUserId);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockTask);
      });

      it('should throw error when get fails', async () => {
        (getDocs as any).mockRejectedValue(new Error('Firestore error'));

        await expect(getUserSimpleTasks(mockUserId)).rejects.toThrow();
      });
    });

    describe('updateSimpleTask', () => {
      it('should update a task successfully', async () => {
        (updateDoc as any).mockResolvedValue(undefined);

        const updates = { title: 'Updated Task' };
        await updateSimpleTask(mockTaskId, updates);

        expect(updateDoc).toHaveBeenCalledTimes(1);
      });

      it('should handle date conversion in updates', async () => {
        (updateDoc as any).mockResolvedValue(undefined);

        const updates = { dueDate: new Date('2024-12-31') };
        await updateSimpleTask(mockTaskId, updates);

        expect(updateDoc).toHaveBeenCalledTimes(1);
      });

      it('should throw error when update fails', async () => {
        (updateDoc as any).mockRejectedValue(new Error('Firestore error'));

        await expect(updateSimpleTask(mockTaskId, {})).rejects.toThrow();
      });
    });

    describe('deleteSimpleTask', () => {
      it('should delete a task successfully', async () => {
        (deleteDoc as any).mockResolvedValue(undefined);

        await deleteSimpleTask(mockTaskId);

        expect(deleteDoc).toHaveBeenCalled();
      });

      it('should throw error when delete fails', async () => {
        (deleteDoc as any).mockRejectedValue(new Error('Firestore error'));

        await expect(deleteSimpleTask(mockTaskId)).rejects.toThrow();
      });
    });
  });

  describe('Utility Functions', () => {
    const mockTasks: SimpleTask[] = [
      { ...mockTask, id: '1', title: 'Task 1', completed: false, dueDate: new Date('2024-01-15') },
      { ...mockTask, id: '2', title: 'Task 2', completed: true, dueDate: new Date('2024-02-15') },
      { ...mockTask, id: '3', title: 'Task 3', completed: false, dueDate: new Date('2024-03-15') },
      { ...mockTask, id: '4', title: 'Task 4', completed: false, dueDate: undefined }
    ];

    describe('filterTasksByCompletion', () => {
      it('should filter completed tasks', () => {
        const result = filterTasksByCompletion(mockTasks, true);
        expect(result).toHaveLength(1);
        expect(result[0].completed).toBe(true);
      });

      it('should filter incomplete tasks', () => {
        const result = filterTasksByCompletion(mockTasks, false);
        expect(result).toHaveLength(3);
        expect(result.every(task => !task.completed)).toBe(true);
      });

      it('should return all tasks when no filter', () => {
        const result = filterTasksByCompletion(mockTasks);
        expect(result).toHaveLength(4);
      });
    });

    describe('filterTasksByDueDate', () => {
      it('should filter tasks by due date range', () => {
        const result = filterTasksByDueDate(
          mockTasks,
          new Date('2024-02-01'),
          new Date('2024-02-28')
        );

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
      });

      it('should exclude tasks without due dates', () => {
        const result = filterTasksByDueDate(mockTasks, new Date('2024-01-01'));
        expect(result).toHaveLength(3); // Excludes task without due date
      });
    });

    describe('searchTasks', () => {
      it('should search tasks by title', () => {
        const result = searchTasks(mockTasks, 'Task 1');
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Task 1');
      });

      it('should search tasks by description', () => {
        const tasksWithDescription = mockTasks.map(task => ({
          ...task,
          description: task.id === '2' ? 'Important task' : 'Regular task'
        }));

        const result = searchTasks(tasksWithDescription, 'important');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
      });

      it('should return all tasks for empty search term', () => {
        const result = searchTasks(mockTasks, '');
        expect(result).toHaveLength(4);
      });

      it('should be case insensitive', () => {
        const result = searchTasks(mockTasks, 'task 1');
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Task 1');
      });
    });

    describe('sortTasksByDueDate', () => {
      it('should sort tasks by due date ascending', () => {
        const result = sortTasksByDueDate(mockTasks, true);
        expect(result[0].id).toBe('1'); // Jan 15
        expect(result[1].id).toBe('2'); // Feb 15
        expect(result[2].id).toBe('3'); // Mar 15
        expect(result[3].id).toBe('4'); // No due date (goes to end)
      });

      it('should sort tasks by due date descending', () => {
        const result = sortTasksByDueDate(mockTasks, false);
        expect(result[0].id).toBe('3'); // Mar 15
        expect(result[1].id).toBe('2'); // Feb 15
        expect(result[2].id).toBe('1'); // Jan 15
        expect(result[3].id).toBe('4'); // No due date (goes to end)
      });
    });

    describe('sortTasksByCreatedDate', () => {
      it('should sort tasks by created date', () => {
        const tasksWithDifferentDates = mockTasks.map((task, index) => ({
          ...task,
          createdAt: new Date(`2024-01-${index + 1}`)
        }));

        const result = sortTasksByCreatedDate(tasksWithDifferentDates, true);
        expect(result[0].createdAt.getDate()).toBe(1);
        expect(result[3].createdAt.getDate()).toBe(4);
      });
    });

    describe('getTasksDueSoon', () => {
      it('should get tasks due within specified days', () => {
        const now = new Date('2024-01-10');
        vi.setSystemTime(now);

        const result = getTasksDueSoon(mockTasks, 7);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1'); // Due Jan 15, within 7 days of Jan 10

        vi.useRealTimers();
      });

      it('should exclude completed tasks', () => {
        const now = new Date('2024-02-10');
        vi.setSystemTime(now);

        const result = getTasksDueSoon(mockTasks, 7);
        expect(result).toHaveLength(0); // Task 2 is due Feb 15 but completed

        vi.useRealTimers();
      });
    });

    describe('getOverdueTasks', () => {
      it('should get overdue tasks', () => {
        const now = new Date('2024-02-20');
        vi.setSystemTime(now);

        const result = getOverdueTasks(mockTasks);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1'); // Due Jan 15, overdue by Feb 20

        vi.useRealTimers();
      });

      it('should exclude completed tasks', () => {
        const now = new Date('2024-03-01');
        vi.setSystemTime(now);

        const result = getOverdueTasks(mockTasks);
        expect(result).toHaveLength(1); // Only task 1, task 2 is completed

        vi.useRealTimers();
      });
    });

    describe('getTaskStatistics', () => {
      it('should calculate task statistics correctly', () => {
        const now = new Date('2024-02-20');
        vi.setSystemTime(now);

        const stats = getTaskStatistics(mockTasks);

        expect(stats.total).toBe(4);
        expect(stats.completed).toBe(1);
        expect(stats.pending).toBe(3);
        expect(stats.overdue).toBe(1); // Task 1 is overdue
        expect(stats.completionRate).toBe(25); // 1/4 = 25%

        vi.useRealTimers();
      });
    });
  });

  describe('Task Actions', () => {
    describe('completeTask', () => {
      it('should mark task as completed', async () => {
        (updateDoc as any).mockResolvedValue(undefined);

        await completeTask(mockTaskId);

        expect(updateDoc).toHaveBeenCalledTimes(1);
      });
    });

    describe('uncompleteTask', () => {
      it('should mark task as incomplete', async () => {
        (updateDoc as any).mockResolvedValue(undefined);

        await uncompleteTask(mockTaskId);

        expect(updateDoc).toHaveBeenCalledTimes(1);
      });
    });

    describe('toggleTaskCompletion', () => {
      it('should toggle task completion status', async () => {
        const mockDocSnap = {
          exists: () => true,
          id: mockTaskId,
          data: () => ({
            ...mockTask,
            completed: false,
            createdAt: { toDate: () => mockTask.createdAt },
            updatedAt: { toDate: () => mockTask.updatedAt },
            dueDate: { toDate: () => mockTask.dueDate }
          })
        };
        (getDoc as any).mockResolvedValue(mockDocSnap);
        (updateDoc as any).mockResolvedValue(undefined);

        await toggleTaskCompletion(mockTaskId);

        expect(updateDoc).toHaveBeenCalledTimes(1);
      });

      it('should throw error when task not found', async () => {
        const mockDocSnap = {
          exists: () => false
        };
        (getDoc as any).mockResolvedValue(mockDocSnap);

        await expect(toggleTaskCompletion(mockTaskId)).rejects.toThrow('Task not found');
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('bulkUpdateTasks', () => {
      it('should update multiple tasks', async () => {
        (updateDoc as any).mockResolvedValue(undefined);

        const updates = [
          { id: '1', updates: { title: 'Updated Task 1' } },
          { id: '2', updates: { completed: true } }
        ];

        await bulkUpdateTasks(updates);

        expect(updateDoc).toHaveBeenCalledTimes(2);
      });
    });

    describe('bulkCompleteTasks', () => {
      it('should complete multiple tasks', async () => {
        (updateDoc as any).mockResolvedValue(undefined);

        const taskIds = ['1', '2', '3'];
        await bulkCompleteTasks(taskIds);

        expect(updateDoc).toHaveBeenCalledTimes(3);
      });
    });

    describe('bulkDeleteTasks', () => {
      it('should delete multiple tasks', async () => {
        (deleteDoc as any).mockResolvedValue(undefined);

        const taskIds = ['1', '2', '3'];
        await bulkDeleteTasks(taskIds);

        expect(deleteDoc).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('getFilteredAndSortedTasks', () => {
    it('should get filtered and sorted tasks', async () => {
      const testTasks: SimpleTask[] = [
        { ...mockTask, id: '1', title: 'Task 1', completed: false, dueDate: new Date('2024-01-15') },
        { ...mockTask, id: '2', title: 'Task 2', completed: true, dueDate: new Date('2024-02-15') },
        { ...mockTask, id: '3', title: 'Task 3', completed: false, dueDate: new Date('2024-03-15') },
        { ...mockTask, id: '4', title: 'Task 4', completed: false, dueDate: undefined }
      ];

      const mockQuerySnapshot = {
        forEach: vi.fn((callback) => {
          testTasks.forEach((task) => {
            callback({
              id: task.id,
              data: () => ({
                ...task,
                createdAt: { toDate: () => task.createdAt },
                updatedAt: { toDate: () => task.updatedAt },
                dueDate: task.dueDate ? { toDate: () => task.dueDate } : null
              })
            });
          });
        })
      };
      (getDocs as any).mockResolvedValue(mockQuerySnapshot);

      const result = await getFilteredAndSortedTasks(
        mockUserId,
        { completed: false },
        'title',
        'asc'
      );

      expect(result.length).toBe(3); // 3 incomplete tasks
      expect(result[0].title).toBe('Task 1'); // Sorted by title
    });
  });
});