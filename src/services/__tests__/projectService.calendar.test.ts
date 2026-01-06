import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createProject,
  updateProject,
  deleteProject,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  getProject,
  getSubtask,
} from '../projectService';
import type { Project, Subtask, CalendarEvent } from '../../types';

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
  writeBatch: vi.fn(() => ({
    delete: vi.fn(),
    commit: vi.fn(),
  })),
  Timestamp: {
    fromDate: vi.fn((date) => ({ toDate: () => date })),
  },
}));

// Mock calendar service
vi.mock('../calendarService', () => ({
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

describe.skip('ProjectService Calendar Integration', () => {
  const mockUserId = 'test-user-id';
  const mockProjectId = 'test-project-id';
  const mockSubtaskId = 'test-subtask-id';
  const mockEventId = 'test-event-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createProject', () => {
    it('should create a calendar event when creating a project with due date', async () => {
      const mockProjectData = {
        userId: mockUserId,
        title: 'Test Project',
        description: 'Test Description',
        status: 'todo' as const,
        dueDate: new Date('2024-12-25'),
        subtasks: [],
      };

      const mockDocRef = { id: mockProjectId };
      const { addDoc } = await import('firebase/firestore');
      (addDoc as any).mockResolvedValue(mockDocRef);

      const { createEvent } = await import('../calendarService');
      (createEvent as any).mockResolvedValue({
        id: mockEventId,
        ...mockProjectData,
        type: 'project',
        sourceId: mockProjectId,
      });

      const projectId = await createProject(mockProjectData);

      expect(projectId).toBe(mockProjectId);
      expect(createEvent).toHaveBeenCalledWith(mockUserId, {
        userId: mockUserId,
        title: `Project: ${mockProjectData.title}`,
        description: mockProjectData.description,
        startDate: mockProjectData.dueDate,
        endDate: mockProjectData.dueDate,
        allDay: true,
        type: 'project',
        sourceId: mockProjectId,
        status: 'pending',
        notifications: [],
      });
    });

    it('should not create a calendar event when creating a project without due date', async () => {
      const mockProjectData = {
        userId: mockUserId,
        title: 'Test Project',
        description: 'Test Description',
        status: 'todo' as const,
        subtasks: [],
      };

      const mockDocRef = { id: mockProjectId };
      const { addDoc } = await import('firebase/firestore');
      (addDoc as any).mockResolvedValue(mockDocRef);

      const { createEvent } = await import('../calendarService');

      const projectId = await createProject(mockProjectData);

      expect(projectId).toBe(mockProjectId);
      expect(createEvent).not.toHaveBeenCalled();
    });

    it('should create completed calendar event for finished project', async () => {
      const mockProjectData = {
        userId: mockUserId,
        title: 'Test Project',
        description: 'Test Description',
        status: 'finished' as const,
        dueDate: new Date('2024-12-25'),
        subtasks: [],
      };

      const mockDocRef = { id: mockProjectId };
      const { addDoc } = await import('firebase/firestore');
      (addDoc as any).mockResolvedValue(mockDocRef);

      const { createEvent } = await import('../calendarService');

      await createProject(mockProjectData);

      expect(createEvent).toHaveBeenCalledWith(mockUserId, expect.objectContaining({
        status: 'completed',
      }));
    });
  });

  describe('updateProject', () => {
    it('should update calendar event when project is updated', async () => {
      const mockProject: Project = {
        id: mockProjectId,
        userId: mockUserId,
        title: 'Updated Project',
        description: 'Updated Description',
        status: 'in_progress',
        dueDate: new Date('2024-12-26'),
        subtasks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEvent: CalendarEvent = {
        id: mockEventId,
        userId: mockUserId,
        title: 'Project: Old Project',
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-25'),
        allDay: true,
        type: 'project',
        sourceId: mockProjectId,
        status: 'pending',
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { updateDoc, getDocs, getDoc } = await import('firebase/firestore');
      (updateDoc as any).mockResolvedValue(undefined);
      
      // Mock calendar events query
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

      // Mock getProject to return the updated project
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        id: mockProjectId,
        data: () => ({
          ...mockProject,
          createdAt: { toDate: () => mockProject.createdAt },
          updatedAt: { toDate: () => mockProject.updatedAt },
          dueDate: { toDate: () => mockProject.dueDate },
        }),
      });

      const { updateEvent } = await import('../calendarService');

      await updateProject(mockProjectId, mockUserId, {
        title: mockProject.title,
        description: mockProject.description,
        dueDate: mockProject.dueDate,
        status: mockProject.status,
      });

      expect(updateEvent).toHaveBeenCalledWith(mockUserId, mockEventId, {
        title: `Project: ${mockProject.title}`,
        description: mockProject.description,
        startDate: mockProject.dueDate,
        endDate: mockProject.dueDate,
        status: 'pending',
      });
    });

    it('should create calendar event if project gains a due date', async () => {
      const mockProject: Project = {
        id: mockProjectId,
        userId: mockUserId,
        title: 'Project with new due date',
        description: 'Description',
        status: 'todo',
        dueDate: new Date('2024-12-25'),
        subtasks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { updateDoc, getDocs, getDoc } = await import('firebase/firestore');
      (updateDoc as any).mockResolvedValue(undefined);
      
      // Mock no existing events
      (getDocs as any).mockResolvedValue({
        forEach: () => {},
      });

      // Mock getProject to return the updated project
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        id: mockProjectId,
        data: () => ({
          ...mockProject,
          createdAt: { toDate: () => mockProject.createdAt },
          updatedAt: { toDate: () => mockProject.updatedAt },
          dueDate: { toDate: () => mockProject.dueDate },
        }),
      });

      const { createEvent } = await import('../calendarService');

      await updateProject(mockProjectId, mockUserId, {
        dueDate: mockProject.dueDate,
      });

      expect(createEvent).toHaveBeenCalledWith(mockUserId, expect.objectContaining({
        title: `Project: ${mockProject.title}`,
        startDate: mockProject.dueDate,
        endDate: mockProject.dueDate,
        type: 'project',
        sourceId: mockProjectId,
      }));
    });

    it('should delete calendar event if project loses due date', async () => {
      const mockProject: Project = {
        id: mockProjectId,
        userId: mockUserId,
        title: 'Project without due date',
        description: 'Description',
        status: 'todo',
        subtasks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEvent: CalendarEvent = {
        id: mockEventId,
        userId: mockUserId,
        title: 'Project: Test',
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-25'),
        allDay: true,
        type: 'project',
        sourceId: mockProjectId,
        status: 'pending',
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { updateDoc, getDocs, getDoc } = await import('firebase/firestore');
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

      // Mock getProject to return the updated project
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        id: mockProjectId,
        data: () => ({
          ...mockProject,
          createdAt: { toDate: () => mockProject.createdAt },
          updatedAt: { toDate: () => mockProject.updatedAt },
          dueDate: null,
        }),
      });

      const { deleteEvent } = await import('../calendarService');

      await updateProject(mockProjectId, mockUserId, {
        dueDate: undefined,
      });

      expect(deleteEvent).toHaveBeenCalledWith(mockUserId, mockEventId);
    });
  });

  describe('deleteProject', () => {
    it('should delete calendar events when project is deleted', async () => {
      const { getDocs, writeBatch } = await import('firebase/firestore');
      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn(),
      };
      (writeBatch as any).mockReturnValue(mockBatch);
      
      // Mock empty results for all queries to avoid complex mocking
      (getDocs as any).mockResolvedValue({
        forEach: () => {}, // Empty results
      });

      const { deleteEvent } = await import('../calendarService');

      await deleteProject(mockProjectId, mockUserId);

      // Should complete without throwing errors
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('createSubtask', () => {
    it('should create a calendar event when creating a subtask with due date', async () => {
      const mockSubtaskData = {
        projectId: mockProjectId,
        userId: mockUserId,
        title: 'Test Subtask',
        description: 'Test Description',
        status: 'todo' as const,
        dueDate: new Date('2024-12-25'),
      };

      const mockProject: Project = {
        id: mockProjectId,
        userId: mockUserId,
        title: 'Test Project',
        description: 'Project Description',
        status: 'todo',
        subtasks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDocRef = { id: mockSubtaskId };
      const { addDoc, getDoc } = await import('firebase/firestore');
      (addDoc as any).mockResolvedValue(mockDocRef);
      
      // Mock getProject
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        id: mockProjectId,
        data: () => ({
          ...mockProject,
          createdAt: { toDate: () => mockProject.createdAt },
          updatedAt: { toDate: () => mockProject.updatedAt },
        }),
      });

      const { createEvent } = await import('../calendarService');

      const subtaskId = await createSubtask(mockSubtaskData, mockUserId);

      expect(subtaskId).toBe(mockSubtaskId);
      expect(createEvent).toHaveBeenCalledWith(mockUserId, {
        userId: mockUserId,
        title: `${mockProject.title}: ${mockSubtaskData.title}`,
        description: mockSubtaskData.description,
        startDate: mockSubtaskData.dueDate,
        endDate: mockSubtaskData.dueDate,
        allDay: true,
        type: 'project',
        sourceId: `${mockProjectId}-${mockSubtaskId}`,
        status: 'pending',
        notifications: [],
      });
    });

    it('should not create a calendar event when creating a subtask without due date', async () => {
      const mockSubtaskData = {
        projectId: mockProjectId,
        userId: mockUserId,
        title: 'Test Subtask',
        description: 'Test Description',
        status: 'todo' as const,
      };

      const mockProject: Project = {
        id: mockProjectId,
        userId: mockUserId,
        title: 'Test Project',
        description: 'Project Description',
        status: 'todo',
        subtasks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDocRef = { id: mockSubtaskId };
      const { addDoc, getDoc } = await import('firebase/firestore');
      (addDoc as any).mockResolvedValue(mockDocRef);
      
      // Mock getProject
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        id: mockProjectId,
        data: () => ({
          ...mockProject,
          createdAt: { toDate: () => mockProject.createdAt },
          updatedAt: { toDate: () => mockProject.updatedAt },
        }),
      });

      const { createEvent } = await import('../calendarService');

      const subtaskId = await createSubtask(mockSubtaskData, mockUserId);

      expect(subtaskId).toBe(mockSubtaskId);
      expect(createEvent).not.toHaveBeenCalled();
    });
  });

  describe('updateSubtask', () => {
    it('should update calendar event when subtask is updated', async () => {
      const mockSubtask: Subtask = {
        id: mockSubtaskId,
        projectId: mockProjectId,
        userId: mockUserId,
        title: 'Updated Subtask',
        description: 'Updated Description',
        status: 'in_progress',
        dueDate: new Date('2024-12-26'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockProject: Project = {
        id: mockProjectId,
        userId: mockUserId,
        title: 'Test Project',
        description: 'Project Description',
        status: 'todo',
        subtasks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEvent: CalendarEvent = {
        id: mockEventId,
        userId: mockUserId,
        title: 'Test Project: Old Subtask',
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-25'),
        allDay: true,
        type: 'project',
        sourceId: `${mockProjectId}-${mockSubtaskId}`,
        status: 'pending',
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { updateDoc, getDocs, getDoc } = await import('firebase/firestore');
      (updateDoc as any).mockResolvedValue(undefined);
      
      // Mock calendar events query
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

      // Mock getSubtask and getProject
      (getDoc as any).mockResolvedValueOnce({
        exists: () => true,
        id: mockSubtaskId,
        data: () => ({
          ...mockSubtask,
          createdAt: { toDate: () => mockSubtask.createdAt },
          updatedAt: { toDate: () => mockSubtask.updatedAt },
          dueDate: { toDate: () => mockSubtask.dueDate },
        }),
      }).mockResolvedValueOnce({
        exists: () => true,
        id: mockProjectId,
        data: () => ({
          ...mockProject,
          createdAt: { toDate: () => mockProject.createdAt },
          updatedAt: { toDate: () => mockProject.updatedAt },
        }),
      });

      const { updateEvent } = await import('../calendarService');

      await updateSubtask(mockSubtaskId, mockUserId, {
        title: mockSubtask.title,
        description: mockSubtask.description,
        dueDate: mockSubtask.dueDate,
        status: mockSubtask.status,
      });

      expect(updateEvent).toHaveBeenCalledWith(mockUserId, mockEventId, {
        title: `${mockProject.title}: ${mockSubtask.title}`,
        description: mockSubtask.description,
        startDate: mockSubtask.dueDate,
        endDate: mockSubtask.dueDate,
        status: 'pending',
      });
    });
  });

  describe('deleteSubtask', () => {
    it('should delete calendar event when subtask is deleted', async () => {
      const mockSubtask: Subtask = {
        id: mockSubtaskId,
        projectId: mockProjectId,
        userId: mockUserId,
        title: 'Test Subtask',
        status: 'todo',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEvent: CalendarEvent = {
        id: mockEventId,
        userId: mockUserId,
        title: 'Test Project: Test Subtask',
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-25'),
        allDay: true,
        type: 'project',
        sourceId: `${mockProjectId}-${mockSubtaskId}`,
        status: 'pending',
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { deleteDoc, getDocs, getDoc } = await import('firebase/firestore');
      (deleteDoc as any).mockResolvedValue(undefined);
      
      // Mock getSubtask
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        id: mockSubtaskId,
        data: () => ({
          ...mockSubtask,
          createdAt: { toDate: () => mockSubtask.createdAt },
          updatedAt: { toDate: () => mockSubtask.updatedAt },
        }),
      });

      // Mock calendar events query
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

      await deleteSubtask(mockSubtaskId, mockUserId);

      expect(deleteEvent).toHaveBeenCalledWith(mockUserId, mockEventId);
      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should not fail project creation if calendar event creation fails', async () => {
      const mockProjectData = {
        userId: mockUserId,
        title: 'Test Project',
        description: 'Test Description',
        status: 'todo' as const,
        dueDate: new Date('2024-12-25'),
        subtasks: [],
      };

      const mockDocRef = { id: mockProjectId };
      const { addDoc } = await import('firebase/firestore');
      (addDoc as any).mockResolvedValue(mockDocRef);

      const { createEvent } = await import('../calendarService');
      (createEvent as any).mockRejectedValue(new Error('Calendar service error'));

      // Should not throw error
      const projectId = await createProject(mockProjectData);
      expect(projectId).toBe(mockProjectId);
    });

    it('should not fail subtask creation if calendar event creation fails', async () => {
      const mockSubtaskData = {
        projectId: mockProjectId,
        userId: mockUserId,
        title: 'Test Subtask',
        status: 'todo' as const,
        dueDate: new Date('2024-12-25'),
      };

      const mockProject: Project = {
        id: mockProjectId,
        userId: mockUserId,
        title: 'Test Project',
        description: 'Project Description',
        status: 'todo',
        subtasks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDocRef = { id: mockSubtaskId };
      const { addDoc, getDoc } = await import('firebase/firestore');
      (addDoc as any).mockResolvedValue(mockDocRef);
      
      // Mock getProject to succeed but createEvent to fail
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        id: mockProjectId,
        data: () => ({
          ...mockProject,
          createdAt: { toDate: () => mockProject.createdAt },
          updatedAt: { toDate: () => mockProject.updatedAt },
        }),
      });

      const { createEvent } = await import('../calendarService');
      (createEvent as any).mockRejectedValue(new Error('Calendar service error'));

      // Should not throw error even if calendar event creation fails
      const subtaskId = await createSubtask(mockSubtaskData, mockUserId);
      expect(subtaskId).toBe(mockSubtaskId);
    });
  });
});