import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlantService } from '../plantService';
import { FirestoreService, StorageService } from '../firebase';
import type { Plant, PlantPhoto, PlantCareTask } from '../../types';

// Mock Firebase services
vi.mock('../firebase', () => ({
  FirestoreService: {
    getUserCollectionPath: vi.fn(),
    createDocument: vi.fn(),
    getDocument: vi.fn(),
    getDocuments: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
  StorageService: {
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
    getPlantPhotoPath: vi.fn(),
  },
  QueryHelpers: {
    orderByCreated: vi.fn(() => ({ type: 'orderBy', field: 'createdAt', direction: 'desc' })),
  },
}));

// Mock where function from firebase/firestore
vi.mock('firebase/firestore', () => ({
  where: vi.fn((field, operator, value) => ({ type: 'where', field, operator, value })),
}));

describe('PlantService', () => {
  const mockUserId = 'test-user-id';
  const mockPlantId = 'test-plant-id';
  
  const mockPlant: Plant = {
    id: mockPlantId,
    userId: mockUserId,
    name: 'Test Plant',
    species: 'Test Species',
    description: 'A test plant description',
    photos: [],
    careTasks: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockPlantPhoto: PlantPhoto = {
    id: 'photo-1',
    url: 'https://example.com/photo.jpg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    uploadedAt: new Date('2024-01-01'),
    description: 'Test photo',
  };



  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createPlant', () => {
    it('should create a new plant successfully', async () => {
      const plantData = {
        userId: mockUserId,
        name: 'New Plant',
        species: 'New Species',
        description: 'A new plant',
        photos: [],
        careTasks: [],
      };

      vi.mocked(FirestoreService.getUserCollectionPath).mockReturnValue('users/test-user-id/plants');
      vi.mocked(FirestoreService.createDocument).mockResolvedValue('new-plant-id');

      const result = await PlantService.createPlant(plantData);

      expect(result).toBe('new-plant-id');
      expect(FirestoreService.getUserCollectionPath).toHaveBeenCalledWith(mockUserId, 'plants');
      expect(FirestoreService.createDocument).toHaveBeenCalledWith(
        'users/test-user-id/plants',
        expect.objectContaining({
          ...plantData,
          photos: [],
          careTasks: [],
        })
      );
    });

    it('should handle creation errors', async () => {
      const plantData = {
        userId: mockUserId,
        name: 'New Plant',
        description: 'A new plant',
        photos: [],
        careTasks: [],
      };

      vi.mocked(FirestoreService.createDocument).mockRejectedValue(new Error('Firestore error'));

      await expect(PlantService.createPlant(plantData)).rejects.toThrow('Failed to create plant: Firestore error');
    });
  });

  describe('getPlant', () => {
    it('should get a plant by ID successfully', async () => {
      const mockFirestorePlant = {
        ...mockPlant,
        createdAt: { toDate: () => mockPlant.createdAt },
        updatedAt: { toDate: () => mockPlant.updatedAt },
      };

      vi.mocked(FirestoreService.getUserCollectionPath).mockReturnValue('users/test-user-id/plants');
      vi.mocked(FirestoreService.getDocument).mockResolvedValue(mockFirestorePlant);

      const result = await PlantService.getPlant(mockUserId, mockPlantId);

      expect(result).toEqual(mockPlant);
      expect(FirestoreService.getDocument).toHaveBeenCalledWith('users/test-user-id/plants', mockPlantId);
    });

    it('should return null when plant not found', async () => {
      vi.mocked(FirestoreService.getDocument).mockResolvedValue(null);

      const result = await PlantService.getPlant(mockUserId, 'non-existent-id');

      expect(result).toBeNull();
    });

    it('should handle get errors', async () => {
      vi.mocked(FirestoreService.getDocument).mockRejectedValue(new Error('Firestore error'));

      await expect(PlantService.getPlant(mockUserId, mockPlantId)).rejects.toThrow('Failed to get plant: Firestore error');
    });
  });

  describe('getUserPlants', () => {
    it('should get all plants for a user', async () => {
      const mockPlants = [mockPlant];
      const mockFirestorePlants = mockPlants.map(plant => ({
        ...plant,
        createdAt: { toDate: () => plant.createdAt },
        updatedAt: { toDate: () => plant.updatedAt },
      }));

      vi.mocked(FirestoreService.getUserCollectionPath).mockReturnValue('users/test-user-id/plants');
      vi.mocked(FirestoreService.getDocuments).mockResolvedValue(mockFirestorePlants);

      const result = await PlantService.getUserPlants(mockUserId);

      expect(result).toEqual(mockPlants);
      expect(FirestoreService.getDocuments).toHaveBeenCalledWith(
        'users/test-user-id/plants',
        expect.arrayContaining([expect.objectContaining({ type: 'orderBy' })])
      );
    });

    it('should filter plants by search term', async () => {
      const mockPlants = [
        { ...mockPlant, name: 'Rose Plant' },
        { ...mockPlant, id: 'plant-2', name: 'Cactus Plant' },
      ];
      const mockFirestorePlants = mockPlants.map(plant => ({
        ...plant,
        createdAt: { toDate: () => plant.createdAt },
        updatedAt: { toDate: () => plant.updatedAt },
      }));

      vi.mocked(FirestoreService.getDocuments).mockResolvedValue(mockFirestorePlants);

      const result = await PlantService.getUserPlants(mockUserId, { searchTerm: 'rose' });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Rose Plant');
    });

    it('should handle get plants errors', async () => {
      vi.mocked(FirestoreService.getDocuments).mockRejectedValue(new Error('Firestore error'));

      await expect(PlantService.getUserPlants(mockUserId)).rejects.toThrow('Failed to get plants: Firestore error');
    });
  });

  describe('updatePlant', () => {
    it('should update a plant successfully', async () => {
      const updates = { name: 'Updated Plant Name' };

      vi.mocked(FirestoreService.getUserCollectionPath).mockReturnValue('users/test-user-id/plants');
      vi.mocked(FirestoreService.updateDocument).mockResolvedValue();

      await PlantService.updatePlant(mockUserId, mockPlantId, updates);

      expect(FirestoreService.updateDocument).toHaveBeenCalledWith(
        'users/test-user-id/plants',
        mockPlantId,
        updates
      );
    });

    it('should exclude readonly fields from updates', async () => {
      const updates = { 
        id: 'new-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        name: 'Updated Plant Name' 
      };

      vi.mocked(FirestoreService.getUserCollectionPath).mockReturnValue('users/test-user-id/plants');
      vi.mocked(FirestoreService.updateDocument).mockResolvedValue();

      await PlantService.updatePlant(mockUserId, mockPlantId, updates);

      expect(FirestoreService.updateDocument).toHaveBeenCalledWith(
        'users/test-user-id/plants',
        mockPlantId,
        { name: 'Updated Plant Name' }
      );
    });

    it('should handle update errors', async () => {
      vi.mocked(FirestoreService.updateDocument).mockRejectedValue(new Error('Firestore error'));

      await expect(PlantService.updatePlant(mockUserId, mockPlantId, {})).rejects.toThrow('Failed to update plant: Firestore error');
    });
  });

  describe('deletePlant', () => {
    it('should delete a plant and its photos successfully', async () => {
      const plantWithPhotos = {
        ...mockPlant,
        photos: [mockPlantPhoto],
      };

      // Mock the getPlant method on PlantService
      const getPlantSpy = vi.spyOn(PlantService, 'getPlant').mockResolvedValue(plantWithPhotos);
      vi.mocked(StorageService.getPlantPhotoPath).mockReturnValue('users/test-user-id/plants/test-plant-id/photos/photo-1.jpg');
      vi.mocked(StorageService.deleteFile).mockResolvedValue();
      vi.mocked(FirestoreService.getUserCollectionPath).mockReturnValue('users/test-user-id/plants');
      vi.mocked(FirestoreService.deleteDocument).mockResolvedValue();

      await PlantService.deletePlant(mockUserId, mockPlantId);

      expect(getPlantSpy).toHaveBeenCalledWith(mockUserId, mockPlantId);
      expect(StorageService.deleteFile).toHaveBeenCalledWith('users/test-user-id/plants/test-plant-id/photos/photo-1.jpg');
      expect(FirestoreService.deleteDocument).toHaveBeenCalledWith('users/test-user-id/plants', mockPlantId);

      getPlantSpy.mockRestore();
    });

    it('should continue deletion even if photo deletion fails', async () => {
      const plantWithPhotos = {
        ...mockPlant,
        photos: [mockPlantPhoto],
      };

      const getPlantSpy = vi.spyOn(PlantService, 'getPlant').mockResolvedValue(plantWithPhotos);
      vi.mocked(StorageService.deleteFile).mockRejectedValue(new Error('Storage error'));
      vi.mocked(FirestoreService.getUserCollectionPath).mockReturnValue('users/test-user-id/plants');
      vi.mocked(FirestoreService.deleteDocument).mockResolvedValue();

      await PlantService.deletePlant(mockUserId, mockPlantId);

      expect(FirestoreService.deleteDocument).toHaveBeenCalledWith('users/test-user-id/plants', mockPlantId);

      getPlantSpy.mockRestore();
    });

    it('should handle delete errors', async () => {
      vi.mocked(FirestoreService.deleteDocument).mockRejectedValue(new Error('Firestore error'));

      await expect(PlantService.deletePlant(mockUserId, mockPlantId)).rejects.toThrow('Failed to delete plant: Firestore error');
    });
  });

  describe('addPhotoToPlant', () => {
    it('should add a photo to a plant successfully', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockPhotoUrl = 'https://example.com/uploaded-photo.jpg';

      const getPlantSpy = vi.spyOn(PlantService, 'getPlant').mockResolvedValue(mockPlant);
      const updatePlantSpy = vi.spyOn(PlantService, 'updatePlant').mockResolvedValue();
      
      vi.mocked(StorageService.getPlantPhotoPath).mockReturnValue('users/test-user-id/plants/test-plant-id/photos/photo_123.jpg');
      vi.mocked(StorageService.uploadFile).mockResolvedValue(mockPhotoUrl);

      const result = await PlantService.addPhotoToPlant(mockUserId, mockPlantId, mockFile, 'Test description');

      expect(result).toMatchObject({
        url: mockPhotoUrl,
        thumbnailUrl: mockPhotoUrl,
        description: 'Test description',
      });
      expect(result.id).toMatch(/^photo_\d+_[a-z0-9]+$/);
      expect(updatePlantSpy).toHaveBeenCalledWith(mockUserId, mockPlantId, {
        photos: expect.arrayContaining([expect.objectContaining({ url: mockPhotoUrl })])
      });

      getPlantSpy.mockRestore();
      updatePlantSpy.mockRestore();
    });

    it('should handle photo upload errors', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      vi.mocked(StorageService.uploadFile).mockRejectedValue(new Error('Upload error'));

      await expect(PlantService.addPhotoToPlant(mockUserId, mockPlantId, mockFile)).rejects.toThrow('Failed to add photo: Upload error');
    });
  });

  describe('addCareTaskToPlant', () => {
    it('should add a care task to a plant successfully', async () => {
      const careTaskData = {
        title: 'Water plant',
        description: 'Water thoroughly',
        dueDate: new Date('2024-01-15'),
        completed: false,
      };

      const getPlantSpy = vi.spyOn(PlantService, 'getPlant').mockResolvedValue(mockPlant);
      const updatePlantSpy = vi.spyOn(PlantService, 'updatePlant').mockResolvedValue();

      const result = await PlantService.addCareTaskToPlant(mockUserId, mockPlantId, careTaskData);

      expect(result).toMatchObject({
        ...careTaskData,
        plantId: mockPlantId,
      });
      expect(result.id).toMatch(/^task_\d+_[a-z0-9]+$/);
      expect(updatePlantSpy).toHaveBeenCalledWith(mockUserId, mockPlantId, {
        careTasks: expect.arrayContaining([expect.objectContaining(careTaskData)])
      });

      getPlantSpy.mockRestore();
      updatePlantSpy.mockRestore();
    });

    it('should handle care task creation errors', async () => {
      const careTaskData = {
        title: 'Water plant',
        dueDate: new Date('2024-01-15'),
        completed: false,
      };

      const getPlantSpy = vi.spyOn(PlantService, 'getPlant').mockRejectedValue(new Error('Plant not found'));

      await expect(PlantService.addCareTaskToPlant(mockUserId, mockPlantId, careTaskData)).rejects.toThrow('Failed to add care task: Plant not found');

      getPlantSpy.mockRestore();
    });
  });

  describe('validatePlantData', () => {
    it('should validate valid plant data', () => {
      const validData = {
        name: 'Valid Plant',
        description: 'A valid plant description',
        species: 'Valid Species',
      };

      const result = PlantService.validatePlantData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        description: 'A valid description',
      };

      const result = PlantService.validatePlantData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Plant name is required');
    });

    it('should reject empty description', () => {
      const invalidData = {
        name: 'Valid Plant',
        description: '',
      };

      const result = PlantService.validatePlantData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Plant description is required');
    });

    it('should reject name that is too long', () => {
      const invalidData = {
        name: 'A'.repeat(101),
        description: 'Valid description',
      };

      const result = PlantService.validatePlantData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Plant name must be less than 100 characters');
    });

    it('should reject description that is too long', () => {
      const invalidData = {
        name: 'Valid Plant',
        description: 'A'.repeat(1001),
      };

      const result = PlantService.validatePlantData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Plant description must be less than 1000 characters');
    });

    it('should reject species that is too long', () => {
      const invalidData = {
        name: 'Valid Plant',
        description: 'Valid description',
        species: 'A'.repeat(101),
      };

      const result = PlantService.validatePlantData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Plant species must be less than 100 characters');
    });
  });
});