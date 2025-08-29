import { Plant, PlantPhoto, PlantCareTask, PlantFilters } from '../types';
import { PlantService } from './plantService';
import { offlineStorage } from '../utils/offlineStorage';
import { serviceWorkerManager } from '../utils/serviceWorkerManager';

/**
 * Offline-aware wrapper for PlantService
 * Provides the same interface but handles offline scenarios
 */
export class OfflineAwarePlantService {
  
  /**
   * Create a new plant (works offline)
   */
  static async createPlant(plantData: Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const plantId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const plant: Plant = {
      ...plantData,
      id: plantId,
      photos: plantData.photos || [],
      careTasks: plantData.careTasks || [],
      createdAt: now,
      updatedAt: now
    };

    if (serviceWorkerManager.isOnline()) {
      try {
        // Try to create online first
        const actualId = await PlantService.createPlant(plantData);
        
        // Cache the created plant with the real ID
        const createdPlant = { ...plant, id: actualId };
        offlineStorage.cacheData('plants', actualId, createdPlant);
        
        return actualId;
      } catch (error) {
        console.warn('Online creation failed, storing offline:', error);
        // Fall through to offline storage
      }
    }

    // Store offline
    offlineStorage.cacheData('plants', plantId, plant);
    offlineStorage.addToSyncQueue({
      type: 'create',
      collection: 'plants',
      documentId: plantId,
      data: plant,
      userId: plantData.userId
    });

    // Request background sync
    serviceWorkerManager.requestBackgroundSync('household-sync').catch(console.error);

    return plantId;
  }

  /**
   * Get a plant by ID (checks cache first)
   */
  static async getPlant(userId: string, plantId: string): Promise<Plant | null> {
    // Check cache first
    const cachedPlant = offlineStorage.getCachedData('plants', plantId) as Plant | null;
    
    if (cachedPlant) {
      return cachedPlant;
    }

    if (serviceWorkerManager.isOnline()) {
      try {
        const plant = await PlantService.getPlant(userId, plantId);
        if (plant) {
          // Cache the retrieved plant
          offlineStorage.cacheData('plants', plantId, plant);
        }
        return plant;
      } catch (error) {
        console.warn('Online fetch failed:', error);
      }
    }

    return null;
  }

  /**
   * Update a plant (works offline)
   */
  static async updatePlant(userId: string, plantId: string, updates: Partial<Plant>): Promise<void> {
    const updatedPlant = {
      ...updates,
      id: plantId,
      userId,
      updatedAt: new Date()
    };

    if (serviceWorkerManager.isOnline()) {
      try {
        await PlantService.updatePlant(userId, plantId, updates);
        
        // Update cache with successful update
        const existingPlant = offlineStorage.getCachedData('plants', plantId) as Plant;
        if (existingPlant) {
          const mergedPlant = { ...existingPlant, ...updatedPlant };
          offlineStorage.cacheData('plants', plantId, mergedPlant);
        }
        
        return;
      } catch (error) {
        console.warn('Online update failed, storing offline:', error);
      }
    }

    // Update cache
    const existingPlant = offlineStorage.getCachedData('plants', plantId) as Plant;
    if (existingPlant) {
      const mergedPlant = { ...existingPlant, ...updatedPlant };
      offlineStorage.cacheData('plants', plantId, mergedPlant);
    }

    // Add to sync queue
    offlineStorage.addToSyncQueue({
      type: 'update',
      collection: 'plants',
      documentId: plantId,
      data: updatedPlant,
      userId
    });

    serviceWorkerManager.requestBackgroundSync('household-sync').catch(console.error);
  }

  /**
   * Delete a plant (works offline)
   */
  static async deletePlant(userId: string, plantId: string): Promise<void> {
    if (serviceWorkerManager.isOnline()) {
      try {
        await PlantService.deletePlant(userId, plantId);
        offlineStorage.removeCachedData('plants', plantId);
        return;
      } catch (error) {
        console.warn('Online delete failed, storing offline:', error);
      }
    }

    // Mark as deleted in cache (we could implement tombstones)
    offlineStorage.removeCachedData('plants', plantId);

    // Add to sync queue
    offlineStorage.addToSyncQueue({
      type: 'delete',
      collection: 'plants',
      documentId: plantId,
      userId
    });

    serviceWorkerManager.requestBackgroundSync('household-sync').catch(console.error);
  }

  /**
   * Get all plants for a user (returns cached data when offline)
   */
  static async getUserPlants(userId: string, filters?: PlantFilters): Promise<Plant[]> {
    if (serviceWorkerManager.isOnline()) {
      try {
        const plants = await PlantService.getUserPlants(userId, filters);
        
        // Cache all retrieved plants
        plants.forEach(plant => {
          offlineStorage.cacheData('plants', plant.id, plant);
        });
        
        return plants;
      } catch (error) {
        console.warn('Online fetch failed, using cached data:', error);
      }
    }

    // Return cached data
    const cachedPlants = offlineStorage.getCachedData('plants') as Record<string, Plant>;
    let plants = Object.values(cachedPlants).filter(plant => plant.userId === userId);

    // Apply filters if provided
    if (filters) {
      plants = this.applyFilters(plants, filters);
    }

    return plants;
  }

  /**
   * Upload a photo for a plant (works offline with local storage)
   */
  static async uploadPlantPhoto(
    userId: string,
    plantId: string,
    file: File,
    description?: string
  ): Promise<PlantPhoto> {
    const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create a local URL for the photo
    const localUrl = URL.createObjectURL(file);
    
    const photo: PlantPhoto = {
      id: photoId,
      url: localUrl,
      thumbnailUrl: localUrl, // In a real implementation, you'd generate a thumbnail
      uploadedAt: new Date(),
      description
    };

    if (serviceWorkerManager.isOnline()) {
      try {
        const uploadedPhoto = await PlantService.uploadPlantPhoto(userId, plantId, file, description);
        
        // Update the plant with the real photo
        const plant = offlineStorage.getCachedData('plants', plantId) as Plant;
        if (plant) {
          const updatedPhotos = [...plant.photos, uploadedPhoto];
          const updatedPlant = { ...plant, photos: updatedPhotos, updatedAt: new Date() };
          offlineStorage.cacheData('plants', plantId, updatedPlant);
        }
        
        // Clean up the local URL
        URL.revokeObjectURL(localUrl);
        
        return uploadedPhoto;
      } catch (error) {
        console.warn('Online photo upload failed, storing locally:', error);
      }
    }

    // Store photo reference locally
    const plant = offlineStorage.getCachedData('plants', plantId) as Plant;
    if (plant) {
      const updatedPhotos = [...plant.photos, photo];
      const updatedPlant = { ...plant, photos: updatedPhotos, updatedAt: new Date() };
      offlineStorage.cacheData('plants', plantId, updatedPlant);
      
      // Add to sync queue (we'd need to handle file uploads specially)
      offlineStorage.addToSyncQueue({
        type: 'update',
        collection: 'plants',
        documentId: plantId,
        data: { photos: updatedPhotos },
        userId
      });
    }

    serviceWorkerManager.requestBackgroundSync('household-sync').catch(console.error);
    
    return photo;
  }

  /**
   * Add a care task to a plant (works offline)
   */
  static async addCareTask(
    userId: string,
    plantId: string,
    taskData: Omit<PlantCareTask, 'id'>
  ): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const careTask: PlantCareTask = {
      ...taskData,
      id: taskId
    };

    if (serviceWorkerManager.isOnline()) {
      try {
        const actualTaskId = await PlantService.addCareTask(userId, plantId, taskData);
        
        // Update cache with real task ID
        const plant = offlineStorage.getCachedData('plants', plantId) as Plant;
        if (plant) {
          const updatedTasks = [...plant.careTasks, { ...careTask, id: actualTaskId }];
          const updatedPlant = { ...plant, careTasks: updatedTasks, updatedAt: new Date() };
          offlineStorage.cacheData('plants', plantId, updatedPlant);
        }
        
        return actualTaskId;
      } catch (error) {
        console.warn('Online care task creation failed, storing offline:', error);
      }
    }

    // Store offline
    const plant = offlineStorage.getCachedData('plants', plantId) as Plant;
    if (plant) {
      const updatedTasks = [...plant.careTasks, careTask];
      const updatedPlant = { ...plant, careTasks: updatedTasks, updatedAt: new Date() };
      offlineStorage.cacheData('plants', plantId, updatedPlant);
      
      offlineStorage.addToSyncQueue({
        type: 'update',
        collection: 'plants',
        documentId: plantId,
        data: { careTasks: updatedTasks },
        userId
      });
    }

    serviceWorkerManager.requestBackgroundSync('household-sync').catch(console.error);
    
    return taskId;
  }

  /**
   * Apply filters to plants array (client-side filtering for cached data)
   */
  private static applyFilters(plants: Plant[], filters: PlantFilters): Plant[] {
    let filtered = [...plants];

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(plant => 
        plant.name.toLowerCase().includes(searchLower) ||
        plant.species?.toLowerCase().includes(searchLower) ||
        plant.description.toLowerCase().includes(searchLower)
      );
    }

    if (filters.hasPhotos !== undefined) {
      filtered = filtered.filter(plant => 
        filters.hasPhotos ? plant.photos.length > 0 : plant.photos.length === 0
      );
    }

    if (filters.hasTasks !== undefined) {
      filtered = filtered.filter(plant => 
        filters.hasTasks ? plant.careTasks.length > 0 : plant.careTasks.length === 0
      );
    }

    return filtered;
  }
}