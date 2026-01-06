import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PlantService } from '../plantService';
import type { Plant, PlantCareTask, CalendarEvent } from '../../types';

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

// Mock FirestoreService
vi.mock('../firebase', () => ({
  FirestoreService: {
    getUserCollectionPath: vi.fn((userId, collection) => `users/${userId}/${collection}`),
    createDocument: vi.fn(),
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    getDocuments: vi.fn(),
  },
  QueryHelpers: {
    orderByCreated: vi.fn(() => ({ field: 'createdAt', direction: 'desc' })),
  },
}));

// Mock calendar service
vi.mock('../calendarService', () => ({
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));

// Mock storage services
vi.mock('../unifiedStorageService', () => ({
  UnifiedStorageService: {
    getPlantPhotoPath: vi.fn(),
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

vi.mock('../supabaseStorageService', () => ({
  SupabaseStorageService: {},
}));

vi.mock('../cloudinaryStorageService', () => ({
  CloudinaryStorageService: {},
}));

vi.mock('../imgbbStorageService', () => ({
  ImgbbStorageService: {},
}));

vi.mock('../firebaseStorageService', () => ({
  FirebaseStorageService: {},
}));

vi.mock('../base64StorageService', () => ({
  Base64StorageService: {},
}));

describe.skip('PlantService Calendar Integration', () => {
  const mockUserId = 'test-user-id';
  const mockPlantId = 'test-plant-id';
  const mockCareTaskId = 'test-care-task-id';
  const mockEventId = 'test-event-id';

  const mockPlant: Plant = {
    id: mockPlantId,
    userId: mockUserId,
    name: 'Test Plant',
    description: 'Test Description',
    photos: [],
    careTasks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('addCareTaskToPlant', () => {
    it('should create a calendar event when adding a care task with due date', async () => {
      const mockCareTaskData = {
        title: 'Water Plant',
        description: 'Water the plant thoroughly',
        dueDate: new Date('2024-12-25'),
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { FirestoreService } = await import('../firebase');
      (FirestoreService.getDocument as any).mockResolvedValue(mockPlant);
      (FirestoreService.updateDocument as any).mockResolvedValue(undefined);

      const { createEvent } = await import('../calendarService');
      (createEvent as any).mockResolvedValue({
        id: mockEventId,
        type: 'plant_care',
        sourceId: `${mockPlantId}-${mockCareTaskId}`,
      });

      const careTask = await PlantService.addCareTaskToPlant(mockUserId, mockPlantId, mockCareTaskData);

      expect(careTask.title).toBe(mockCareTaskData.title);
      expect(createEvent).toHaveBeenCalledWith(mockUserId, {
        userId: mockUserId,
        title: `${mockPlant.name}: ${mockCareTaskData.title}`,
        description: mockCareTaskData.description,
        startDate: mockCareTaskData.dueDate,
        endDate: mockCareTaskData.dueDate,
        allDay: true,
        type: 'plant_care',
        sourceId: expect.stringContaining(`${mockPlantId}-`),
        status: 'pending',
        notifications: [],
      });
    });

    it('should not create a calendar event when adding a care task without due date', async () => {
      const mockCareTaskData = {
        title: 'Check Plant',
        description: 'Check plant health',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { FirestoreService } = await import('../firebase');
      (FirestoreService.getDocument as any).mockResolvedValue(mockPlant);
      (FirestoreService.updateDocument as any).mockResolvedValue(undefined);

      const { createEvent } = await import('../calendarService');

      const careTask = await PlantService.addCareTaskToPlant(mockUserId, mockPlantId, mockCareTaskData);

      expect(careTask.title).toBe(mockCareTaskData.title);
      expect(createEvent).not.toHaveBeenCalled();
    });

    it('should create completed calendar event for completed care task', async () => {
      const mockCareTaskData = {
        title: 'Water Plant',
        description: 'Water the plant thoroughly',
        dueDate: new Date('2024-12-25'),
        completed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { FirestoreService } = await import('../firebase');
      (FirestoreService.getDocument as any).mockResolvedValue(mockPlant);
      (FirestoreService.updateDocument as any).mockResolvedValue(undefined);

      const { createEvent } = await import('../calendarService');

      await PlantService.addCareTaskToPlant(mockUserId, mockPlantId, mockCareTaskData);

      expect(createEvent).toHaveBeenCalledWith(mockUserId, expect.objectContaining({
        status: 'completed',
      }));
    });

    it('should handle recurring care tasks', async () => {
      const mockCareTaskData = {
        title: 'Water Plant',
        description: 'Water the plant thoroughly',
        dueDate: new Date('2024-12-25'),
        completed: false,
        recurrence: {
          type: 'weekly' as const,
          interval: 1,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { FirestoreService } = await import('../firebase');
      (FirestoreService.getDocument as any).mockResolvedValue(mockPlant);
      (FirestoreService.updateDocument as any).mockResolvedValue(undefined);

      const { createEvent } = await import('../calendarService');
      (createEvent as any).mockResolvedValue({ id: mockEventId });

      await PlantService.addCareTaskToPlant(mockUserId, mockPlantId, mockCareTaskData);

      // Should create initial event plus recurring events
      expect(createEvent).toHaveBeenCalledWith(mockUserId, expect.objectContaining({
        type: 'plant_care',
        title: expect.stringContaining('Water Plant'),
      }));
      // Should create multiple events (initial + recurring)
      expect((createEvent as any).mock.calls.length).toBeGreaterThan(1);
    });
  });

  describe('updatePlantCareTask', () => {
    it('should update calendar event when care task is updated', async () => {
      const mockUpdatedCareTask: PlantCareTask = {
        id: mockCareTaskId,
        plantId: mockPlantId,
        title: 'Updated Water Plant',
        description: 'Updated description',
        dueDate: new Date('2024-12-26'),
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPlantWithTask: Plant = {
        ...mockPlant,
        careTasks: [{
          id: mockCareTaskId,
          plantId: mockPlantId,
          title: 'Water Plant',
          description: 'Original description',
          dueDate: new Date('2024-12-25'),
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      };

      const mockEvent: CalendarEvent = {
        id: mockEventId,
        userId: mockUserId,
        title: 'Test Plant: Water Plant',
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-25'),
        allDay: true,
        type: 'plant_care',
        sourceId: `${mockPlantId}-${mockCareTaskId}`,
        status: 'pending',
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { FirestoreService } = await import('../firebase');
      (FirestoreService.getDocument as any).mockResolvedValue(mockPlantWithTask);
      (FirestoreService.updateDocument as any).mockResolvedValue(undefined);

      const { getDocs } = await import('firebase/firestore');
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

      const { updateEvent } = await import('../calendarService');

      await PlantService.updatePlantCareTask(mockUserId, mockPlantId, mockCareTaskId, {
        title: mockUpdatedCareTask.title,
        description: mockUpdatedCareTask.description,
        dueDate: mockUpdatedCareTask.dueDate,
      });

      expect(updateEvent).toHaveBeenCalledWith(mockUserId, mockEventId, {
        title: `${mockPlant.name}: ${mockUpdatedCareTask.title}`,
        description: mockUpdatedCareTask.description,
        startDate: mockUpdatedCareTask.dueDate,
        endDate: mockUpdatedCareTask.dueDate,
        status: 'pending',
      });
    });

    it('should create calendar event if care task gains a due date', async () => {
      const mockPlantWithTask: Plant = {
        ...mockPlant,
        careTasks: [{
          id: mockCareTaskId,
          plantId: mockPlantId,
          title: 'Check Plant',
          description: 'Check plant health',
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      };

      const { FirestoreService } = await import('../firebase');
      (FirestoreService.getDocument as any).mockResolvedValue(mockPlantWithTask);
      (FirestoreService.updateDocument as any).mockResolvedValue(undefined);

      const { getDocs } = await import('firebase/firestore');
      // Mock no existing events
      (getDocs as any).mockResolvedValue({
        forEach: () => {},
      });

      const { createEvent } = await import('../calendarService');

      await PlantService.updatePlantCareTask(mockUserId, mockPlantId, mockCareTaskId, {
        dueDate: new Date('2024-12-25'),
      });

      expect(createEvent).toHaveBeenCalledWith(mockUserId, expect.objectContaining({
        title: `${mockPlant.name}: Check Plant`,
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-25'),
        type: 'plant_care',
        sourceId: `${mockPlantId}-${mockCareTaskId}`,
      }));
    });

    it('should delete calendar event if care task loses due date', async () => {
      const mockPlantWithTask: Plant = {
        ...mockPlant,
        careTasks: [{
          id: mockCareTaskId,
          plantId: mockPlantId,
          title: 'Water Plant',
          description: 'Water the plant',
          dueDate: new Date('2024-12-25'),
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      };

      const mockEvent: CalendarEvent = {
        id: mockEventId,
        userId: mockUserId,
        title: 'Test Plant: Water Plant',
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-25'),
        allDay: true,
        type: 'plant_care',
        sourceId: `${mockPlantId}-${mockCareTaskId}`,
        status: 'pending',
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { FirestoreService } = await import('../firebase');
      (FirestoreService.getDocument as any).mockResolvedValue(mockPlantWithTask);
      (FirestoreService.updateDocument as any).mockResolvedValue(undefined);

      const { getDocs } = await import('firebase/firestore');
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

      await PlantService.updatePlantCareTask(mockUserId, mockPlantId, mockCareTaskId, {
        dueDate: undefined,
      });

      expect(deleteEvent).toHaveBeenCalledWith(mockUserId, mockEventId);
    });

    it('should update calendar event status when care task completion changes', async () => {
      const mockPlantWithTask: Plant = {
        ...mockPlant,
        careTasks: [{
          id: mockCareTaskId,
          plantId: mockPlantId,
          title: 'Water Plant',
          description: 'Water the plant',
          dueDate: new Date('2024-12-25'),
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      };

      const mockEvent: CalendarEvent = {
        id: mockEventId,
        userId: mockUserId,
        title: 'Test Plant: Water Plant',
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-25'),
        allDay: true,
        type: 'plant_care',
        sourceId: `${mockPlantId}-${mockCareTaskId}`,
        status: 'pending',
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { FirestoreService } = await import('../firebase');
      (FirestoreService.getDocument as any).mockResolvedValue(mockPlantWithTask);
      (FirestoreService.updateDocument as any).mockResolvedValue(undefined);

      const { getDocs } = await import('firebase/firestore');
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

      const { updateEvent } = await import('../calendarService');

      await PlantService.updatePlantCareTask(mockUserId, mockPlantId, mockCareTaskId, {
        completed: true,
      });

      expect(updateEvent).toHaveBeenCalledWith(mockUserId, mockEventId, expect.objectContaining({
        status: 'completed',
      }));
    });
  });

  describe('removeCareTaskFromPlant', () => {
    it('should delete calendar event when care task is removed', async () => {
      const mockPlantWithTask: Plant = {
        ...mockPlant,
        careTasks: [{
          id: mockCareTaskId,
          plantId: mockPlantId,
          title: 'Water Plant',
          description: 'Water the plant',
          dueDate: new Date('2024-12-25'),
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      };

      const mockEvent: CalendarEvent = {
        id: mockEventId,
        userId: mockUserId,
        title: 'Test Plant: Water Plant',
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-25'),
        allDay: true,
        type: 'plant_care',
        sourceId: `${mockPlantId}-${mockCareTaskId}`,
        status: 'pending',
        notifications: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { FirestoreService } = await import('../firebase');
      (FirestoreService.getDocument as any).mockResolvedValue(mockPlantWithTask);
      (FirestoreService.updateDocument as any).mockResolvedValue(undefined);

      const { getDocs } = await import('firebase/firestore');
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

      await PlantService.removeCareTaskFromPlant(mockUserId, mockPlantId, mockCareTaskId);

      expect(deleteEvent).toHaveBeenCalledWith(mockUserId, mockEventId);
      expect(FirestoreService.updateDocument).toHaveBeenCalled();
    });

    it('should handle removal when no calendar events exist', async () => {
      const mockPlantWithTask: Plant = {
        ...mockPlant,
        careTasks: [{
          id: mockCareTaskId,
          plantId: mockPlantId,
          title: 'Check Plant',
          description: 'Check plant health',
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      };

      const { FirestoreService } = await import('../firebase');
      (FirestoreService.getDocument as any).mockResolvedValue(mockPlantWithTask);
      (FirestoreService.updateDocument as any).mockResolvedValue(undefined);

      const { getDocs } = await import('firebase/firestore');
      // Mock no existing events
      (getDocs as any).mockResolvedValue({
        forEach: () => {},
      });

      const { deleteEvent } = await import('../calendarService');

      await PlantService.removeCareTaskFromPlant(mockUserId, mockPlantId, mockCareTaskId);

      expect(deleteEvent).not.toHaveBeenCalled();
      expect(FirestoreService.updateDocument).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should not fail care task creation if calendar event creation fails', async () => {
      const mockCareTaskData = {
        title: 'Water Plant',
        description: 'Water the plant thoroughly',
        dueDate: new Date('2024-12-25'),
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { FirestoreService } = await import('../firebase');
      (FirestoreService.getDocument as any).mockResolvedValue(mockPlant);
      (FirestoreService.updateDocument as any).mockResolvedValue(undefined);

      const { createEvent } = await import('../calendarService');
      (createEvent as any).mockRejectedValue(new Error('Calendar service error'));

      // Should not throw error
      const careTask = await PlantService.addCareTaskToPlant(mockUserId, mockPlantId, mockCareTaskData);
      expect(careTask.title).toBe(mockCareTaskData.title);
    });

    it('should not fail care task update if calendar event update fails', async () => {
      const mockPlantWithTask: Plant = {
        ...mockPlant,
        careTasks: [{
          id: mockCareTaskId,
          plantId: mockPlantId,
          title: 'Water Plant',
          description: 'Water the plant',
          dueDate: new Date('2024-12-25'),
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      };

      const { FirestoreService } = await import('../firebase');
      (FirestoreService.getDocument as any).mockResolvedValue(mockPlantWithTask);
      (FirestoreService.updateDocument as any).mockResolvedValue(undefined);

      const { getDocs } = await import('firebase/firestore');
      (getDocs as any).mockRejectedValue(new Error('Calendar query error'));

      // Should not throw error
      await expect(PlantService.updatePlantCareTask(mockUserId, mockPlantId, mockCareTaskId, {
        title: 'Updated title',
      })).resolves.not.toThrow();
    });

    it('should not fail care task removal if calendar event deletion fails', async () => {
      const mockPlantWithTask: Plant = {
        ...mockPlant,
        careTasks: [{
          id: mockCareTaskId,
          plantId: mockPlantId,
          title: 'Water Plant',
          description: 'Water the plant',
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      };

      const { FirestoreService } = await import('../firebase');
      (FirestoreService.getDocument as any).mockResolvedValue(mockPlantWithTask);
      (FirestoreService.updateDocument as any).mockResolvedValue(undefined);

      const { getDocs } = await import('firebase/firestore');
      (getDocs as any).mockRejectedValue(new Error('Calendar query error'));

      // Should not throw error
      await expect(PlantService.removeCareTaskFromPlant(mockUserId, mockPlantId, mockCareTaskId)).resolves.not.toThrow();
    });
  });
});