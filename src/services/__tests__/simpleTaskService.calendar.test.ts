import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createSimpleTask,
  updateSimpleTask,
  deleteSimpleTask,
  getSimpleTask,
} from '../simpleTaskService';
import { getEvent, getEventsForDateRange } from '../calendarService';
import type { SimpleTask, CalendarEvent } from '../../types';

// Mock Firebase
vi.mock('../../config/firebase', () => ({
  db: {},
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
    fromDate: vi.fn((date) => ({ toDate: () => date })),
  },
}));

// Mock calendar service
vi.mock('../calendarService', () => ({
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getEvent: vi.fn(),
  getEventsForDateRange: vi.fn(),
}));

describe('SimpleTaskService Calendar Integration', () => {
  const mockUserId = 'test-user-id';
  const mockTaskId = 'test-task-id';
  const mockEventId = 'test-event-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSimpleTask', () => {
    it('should create a calendar event when creating a task with due date', async () => {
      const mockTaskData = {
        userId: mockUserId,
        title: 'Test Task',
        description: 'Test Description',
        dueDate: new Date('2024-12-25'),
        completed: false,
      };

      const mockDocRef = { id: mockTaskId };
      const { addDoc } = await import('firebase/firestore');
      (addDoc as any).mockResolvedValue(mockDocRef);

      const { createEvent } = await import('../calendarService');
      (createEvent as any).mockResolvedValue({
        id: mockEventId,
        ...mockTaskData,
        type: 'task',
        sourceId: mockTaskId,
      });

      const taskId = await createSimpleTask(mockUserId, mockTaskData);

      expect(taskId).toBe(mockTaskId);
      expect(createEvent).toHaveBeenCalledWith(mockUserId, {
        userId: mockUserId,
        title: mockTaskData.title,
        description: mockTaskData.description,
        startDate: mockTaskData.dueDate,
        endDate: mockTaskData.dueDate,
        allDay: true,
        type: 'task',
        sourceId: mockTaskId,
        status: 'pending',
        notifications: [],
      });
    });

    it('should not create a calendar event when creating a task without due date', async () => {
      const mockTaskData = {
        userId: mockUserId,
        title: 'Test Task',
        description: 'Test Description',
        completed: false,
      };

      const mockDocRef = { id: mockTaskId };
      const { addDoc } = await import('firebase/firestore');
      (addDoc as any).mockResolvedValue(mockDocRef);

      const { createEvent } = await import('../calendarService');

      const taskId = await createSimpleTask(mockUserId, mockTaskData);

      expect(taskId).toBe(mockTaskId);
      expect(createEvent).not.toHaveBeenCalled();
    });

    it('should create completed calendar event for completed task', async () => {
      const mockTaskData = {
        userId: mockUserId,
        title: 'Test Task',
        description: 'Test Description',
        dueDate: new Date('2024-12-25'),
        completed: true,
      };

      const mockDocRef = { id: mockTaskId };
      const { addDoc } = await import('firebase/firestore');
      (addDoc as any).mockResolvedValue(mockDocRef);

      const { createEvent } = await import('../calendarService');

      await createSimpleTask(mockUserId, mockTaskData);

      expect(createEvent).toHaveBeenCalledWith(mockUserId, expect.objectContaining({
        status: 'completed',
      }));
    });
  });

  describe('updateSimpleTask', () => {
    it('should update calendar event when task is updated', async () => {
      const mockTask: SimpleTask = {
        id: mockTaskId,
        userId: mockUserId,
        title: 'Updated Task',
        description: 'Updated Description',
        dueDate: new Date('2024-12-26'),
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEvent: CalendarEvent = {
        id: mockEventId,
        userId: mockUserId,
        title: 'Old Task',
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-25'),
        allDay: true,
        type: 'task',
        sourceId: mockTaskId,
        status: 'pending',
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { updateDoc, getDocs } = await import('firebase/firestore');
      (updateDoc as any).mockResolvedValue(undefined);
      (getDocs as any).mockResolvedValue({
        forEach: (callback: any) => {
          callback({
            id: mockEventId,
            data: () => ({
              ...mockEvent,
              createdAt: { toDate: () => mockEvent.createdAt },
              updatedAt: { toDate: () => mockEvent.updatedAt },
              startDate: { toDate: () => mockEvent.startDate },
              endDate: { toDate: () => mockEvent.endDate },
            }),
          });
        },
      });

      // Mock getSimpleTask to return the updated task
      const { getDoc } = await import('firebase/firestore');
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        id: mockTaskId,
        data: () => ({
          ...mockTask,
          createdAt: { toDate: () => mockTask.createdAt },
          updatedAt: { toDate: () => mockTask.updatedAt },
          dueDate: { toDate: () => mockTask.dueDate },
        }),
      });

      const { updateEvent } = await import('../calendarService');

      await updateSimpleTask(mockUserId, mockTaskId, {
        title: mockTask.title,
        description: mockTask.description,
        dueDate: mockTask.dueDate,
      });

      expect(updateEvent).toHaveBeenCalledWith(mockUserId, mockEventId, {
        title: mockTask.title,
        description: mockTask.description,
        startDate: mockTask.dueDate,
        endDate: mockTask.dueDate,
        status: 'pending',
      });
    });

    it('should create calendar event if task gains a due date', async () => {
      const mockTask: SimpleTask = {
        id: mockTaskId,
        userId: mockUserId,
        title: 'Task with new due date',
        dueDate: new Date('2024-12-25'),
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { updateDoc, getDocs } = await import('firebase/firestore');
      (updateDoc as any).mockResolvedValue(undefined);
      // Mock no existing events
      (getDocs as any).mockResolvedValue({
        forEach: () => {},
      });

      // Mock getSimpleTask to return the updated task
      const { getDoc } = await import('firebase/firestore');
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        id: mockTaskId,
        data: () => ({
          ...mockTask,
          createdAt: { toDate: () => mockTask.createdAt },
          updatedAt: { toDate: () => mockTask.updatedAt },
          dueDate: { toDate: () => mockTask.dueDate },
        }),
      });

      const { createEvent } = await import('../calendarService');

      await updateSimpleTask(mockUserId, mockTaskId, {
        dueDate: mockTask.dueDate,
      });

      expect(createEvent).toHaveBeenCalledWith(mockUserId, expect.objectContaining({
        title: mockTask.title,
        startDate: mockTask.dueDate,
        endDate: mockTask.dueDate,
        type: 'task',
        sourceId: mockTaskId,
      }));
    });

    it('should delete calendar event if task loses due date', async () => {
      const mockTask: SimpleTask = {
        id: mockTaskId,
        userId: mockUserId,
        title: 'Task without due date',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEvent: CalendarEvent = {
        id: mockEventId,
        userId: mockUserId,
        title: 'Task',
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-25'),
        allDay: true,
        type: 'task',
        sourceId: mockTaskId,
        status: 'pending',
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { updateDoc, getDocs } = await import('firebase/firestore');
      (updateDoc as any).mockResolvedValue(undefined);
      (getDocs as any).mockResolvedValue({
        forEach: (callback: any) => {
          callback({
            id: mockEventId,
            data: () => ({
              ...mockEvent,
              createdAt: { toDate: () => mockEvent.createdAt },
              updatedAt: { toDate: () => mockEvent.updatedAt },
              startDate: { toDate: () => mockEvent.startDate },
              endDate: { toDate: () => mockEvent.endDate },
            }),
          });
        },
      });

      // Mock getSimpleTask to return the updated task
      const { getDoc } = await import('firebase/firestore');
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        id: mockTaskId,
        data: () => ({
          ...mockTask,
          createdAt: { toDate: () => mockTask.createdAt },
          updatedAt: { toDate: () => mockTask.updatedAt },
          dueDate: null,
        }),
      });

      const { deleteEvent } = await import('../calendarService');

      await updateSimpleTask(mockUserId, mockTaskId, {
        dueDate: undefined,
      });

      expect(deleteEvent).toHaveBeenCalledWith(mockUserId, mockEventId);
    });

    it('should update calendar event status when task completion changes', async () => {
      const mockTask: SimpleTask = {
        id: mockTaskId,
        userId: mockUserId,
        title: 'Completed Task',
        dueDate: new Date('2024-12-25'),
        completed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEvent: CalendarEvent = {
        id: mockEventId,
        userId: mockUserId,
        title: 'Task',
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-25'),
        allDay: true,
        type: 'task',
        sourceId: mockTaskId,
        status: 'pending',
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { updateDoc, getDocs } = await import('firebase/firestore');
      (updateDoc as any).mockResolvedValue(undefined);
      (getDocs as any).mockResolvedValue({
        forEach: (callback: any) => {
          callback({
            id: mockEventId,
            data: () => ({
              ...mockEvent,
              createdAt: { toDate: () => mockEvent.createdAt },
              updatedAt: { toDate: () => mockEvent.updatedAt },
              startDate: { toDate: () => mockEvent.startDate },
              endDate: { toDate: () => mockEvent.endDate },
            }),
          });
        },
      });

      // Mock getSimpleTask to return the updated task
      const { getDoc } = await import('firebase/firestore');
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        id: mockTaskId,
        data: () => ({
          ...mockTask,
          createdAt: { toDate: () => mockTask.createdAt },
          updatedAt: { toDate: () => mockTask.updatedAt },
          dueDate: { toDate: () => mockTask.dueDate },
        }),
      });

      const { updateEvent } = await import('../calendarService');

      await updateSimpleTask(mockUserId, mockTaskId, {
        completed: true,
      });

      expect(updateEvent).toHaveBeenCalledWith(mockUserId, mockEventId, expect.objectContaining({
        status: 'completed',
      }));
    });
  });

  describe('deleteSimpleTask', () => {
    it('should delete calendar event when task is deleted', async () => {
      const mockEvent: CalendarEvent = {
        id: mockEventId,
        userId: mockUserId,
        title: 'Task',
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-25'),
        allDay: true,
        type: 'task',
        sourceId: mockTaskId,
        status: 'pending',
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { deleteDoc, getDocs } = await import('firebase/firestore');
      (deleteDoc as any).mockResolvedValue(undefined);
      (getDocs as any).mockResolvedValue({
        forEach: (callback: any) => {
          callback({
            id: mockEventId,
            data: () => ({
              ...mockEvent,
              createdAt: { toDate: () => mockEvent.createdAt },
              updatedAt: { toDate: () => mockEvent.updatedAt },
              startDate: { toDate: () => mockEvent.startDate },
              endDate: { toDate: () => mockEvent.endDate },
            }),
          });
        },
      });

      const { deleteEvent } = await import('../calendarService');

      await deleteSimpleTask(mockUserId, mockTaskId);

      expect(deleteEvent).toHaveBeenCalledWith(mockUserId, mockEventId);
      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should handle deletion when no calendar events exist', async () => {
      const { deleteDoc, getDocs } = await import('firebase/firestore');
      (deleteDoc as any).mockResolvedValue(undefined);
      // Mock no existing events
      (getDocs as any).mockResolvedValue({
        forEach: () => {},
      });

      const { deleteEvent } = await import('../calendarService');

      await deleteSimpleTask(mockUserId, mockTaskId);

      expect(deleteEvent).not.toHaveBeenCalled();
      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should not fail task creation if calendar event creation fails', async () => {
      const mockTaskData = {
        userId: mockUserId,
        title: 'Test Task',
        dueDate: new Date('2024-12-25'),
        completed: false,
      };

      const mockDocRef = { id: mockTaskId };
      const { addDoc } = await import('firebase/firestore');
      (addDoc as any).mockResolvedValue(mockDocRef);

      const { createEvent } = await import('../calendarService');
      (createEvent as any).mockRejectedValue(new Error('Calendar service error'));

      // Should not throw error
      const taskId = await createSimpleTask(mockUserId, mockTaskData);
      expect(taskId).toBe(mockTaskId);
    });

    it('should not fail task update if calendar event update fails', async () => {
      const mockTask: SimpleTask = {
        id: mockTaskId,
        userId: mockUserId,
        title: 'Updated Task',
        dueDate: new Date('2024-12-26'),
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { updateDoc, getDocs } = await import('firebase/firestore');
      (updateDoc as any).mockResolvedValue(undefined);
      (getDocs as any).mockRejectedValue(new Error('Calendar query error'));

      // Mock getSimpleTask to return the updated task
      const { getDoc } = await import('firebase/firestore');
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        id: mockTaskId,
        data: () => ({
          ...mockTask,
          createdAt: { toDate: () => mockTask.createdAt },
          updatedAt: { toDate: () => mockTask.updatedAt },
          dueDate: { toDate: () => mockTask.dueDate },
        }),
      });

      // Should not throw error
      await expect(updateSimpleTask(mockUserId, mockTaskId, {
        title: mockTask.title,
      })).resolves.not.toThrow();
    });

    it('should not fail task deletion if calendar event deletion fails', async () => {
      const { deleteDoc, getDocs } = await import('firebase/firestore');
      (deleteDoc as any).mockResolvedValue(undefined);
      (getDocs as any).mockRejectedValue(new Error('Calendar query error'));

      // Should not throw error
      await expect(deleteSimpleTask(mockUserId, mockTaskId)).resolves.not.toThrow();
    });
  });
});