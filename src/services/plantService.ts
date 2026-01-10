import type { 
  Plant, 
  PlantPhoto, 
  PlantCareTask, 
  PlantFilters,
  CreateCalendarEventData,
  CalendarEvent
} from '../types';
import { FirestoreService, QueryHelpers } from './firebase';
import { UnifiedStorageService as StorageService } from './unifiedStorageService';
import { where, collection, query, getDocs } from 'firebase/firestore';
import db from '../config/firebase';

// ============================================================================
// CALENDAR INTEGRATION HELPER FUNCTIONS
// ============================================================================

/**
 * Get calendar events for plant care tasks
 */
const getPlantCareCalendarEvents = async (
  userId: string,
  plantId: string,
  careTaskId: string
): Promise<CalendarEvent[]> => {
  try {
    const sourceId = `${plantId}-${careTaskId}`;
    const q = query(
      collection(db, "users", userId, "calendarEvents"),
      where("type", "==", "plant_care"),
      where("sourceId", "==", sourceId)
    );

    const querySnapshot = await getDocs(q);
    const events: CalendarEvent[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        startDate: data.startDate.toDate(),
        endDate: data.endDate.toDate(),
      } as CalendarEvent);
    });

    return events;
  } catch (error) {
    console.error("Error getting plant care calendar events:", error);
    return [];
  }
};

/**
 * Create calendar event for a plant care task
 */
const createPlantCareCalendarEvent = async (
  userId: string,
  plant: Plant,
  careTask: PlantCareTask
): Promise<void> => {
  if (!careTask.dueDate) return; // Skip care tasks without due dates

  try {
    const { createEvent } = await import('./calendarService');
    
    const eventData: CreateCalendarEventData = {
      userId,
      title: `${plant.name}: ${careTask.title}`,
      description: careTask.description,
      startDate: careTask.dueDate,
      endDate: careTask.dueDate,
      allDay: true,
      type: 'plant_care',
      sourceId: `${plant.id}-${careTask.id}`,
      status: careTask.completed ? 'completed' : 'pending',
      notifications: []
    };

    await createEvent(userId, eventData);

    // Handle recurring care tasks
    if (careTask.recurrence && !careTask.completed) {
      await generateRecurringPlantCareEvents(userId, plant, careTask, careTask.dueDate, 30);
    }
  } catch (error) {
    console.error("Error creating plant care calendar event:", error);
    // Don't throw - calendar event creation should not fail care task creation
  }
};

/**
 * Update calendar event for a plant care task
 */
const updatePlantCareCalendarEvent = async (
  userId: string,
  plant: Plant,
  careTask: PlantCareTask
): Promise<void> => {
  try {
    const { updateEvent, deleteEvent } = await import('./calendarService');
    const events = await getPlantCareCalendarEvents(userId, plant.id, careTask.id);
    
    if (events.length === 0) {
      // Create event if it doesn't exist and care task has due date
      if (careTask.dueDate) {
        await createPlantCareCalendarEvent(userId, plant, careTask);
      }
      return;
    }

    // Update existing event
    const event = events[0]; // Should only be one event per care task
    
    if (!careTask.dueDate) {
      // Remove event if care task no longer has due date
      await deleteEvent(userId, event.id);
      return;
    }

    // Update event with care task changes
    await updateEvent(userId, event.id, {
      title: `${plant.name}: ${careTask.title}`,
      description: careTask.description,
      startDate: careTask.dueDate,
      endDate: careTask.dueDate,
      status: careTask.completed ? 'completed' : 'pending'
    });

    // Handle recurring care tasks
    if (careTask.recurrence && !careTask.completed) {
      await generateRecurringPlantCareEvents(userId, plant, careTask, careTask.dueDate, 30);
    }
  } catch (error) {
    console.error("Error updating plant care calendar event:", error);
    // Don't throw - calendar event update should not fail care task update
  }
};

/**
 * Delete calendar event for a plant care task
 */
const deletePlantCareCalendarEvent = async (
  userId: string,
  plantId: string,
  careTaskId: string
): Promise<void> => {
  try {
    const { deleteEvent } = await import('./calendarService');
    const events = await getPlantCareCalendarEvents(userId, plantId, careTaskId);
    
    // Delete all calendar events for this care task
    await Promise.all(events.map(event => deleteEvent(userId, event.id)));
  } catch (error) {
    console.error("Error deleting plant care calendar event:", error);
    // Don't throw - calendar event deletion should not fail care task deletion
  }
};

/**
 * Generate recurring care events
 */
const generateRecurringPlantCareEvents = async (
  userId: string,
  plant: Plant,
  careTask: PlantCareTask,
  startDate: Date,
  daysAhead: number
): Promise<void> => {
  if (!careTask.recurrence) return;

  try {
    const { createEvent } = await import('./calendarService');
    const { type, interval } = careTask.recurrence;
    let currentDate = new Date(startDate);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const events: CreateCalendarEventData[] = [];

    while (currentDate <= endDate) {
      // Calculate next occurrence
      switch (type) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + interval);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + (interval * 7));
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + interval);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + interval);
          break;
        default:
          return; // Invalid recurrence type
      }

      if (currentDate <= endDate) {
        const eventData: CreateCalendarEventData = {
          userId,
          title: `${plant.name}: ${careTask.title}`,
          description: careTask.description,
          startDate: new Date(currentDate),
          endDate: new Date(currentDate),
          allDay: true,
          type: 'plant_care',
          sourceId: `${plant.id}-${careTask.id}-${currentDate.getTime()}`,
          status: 'pending',
          notifications: []
        };

        events.push(eventData);
      }
    }

    // Create all recurring events
    await Promise.all(events.map(eventData => createEvent(userId, eventData)));
  } catch (error) {
    console.error("Error generating recurring plant care events:", error);
    // Don't throw - recurring event generation should not fail the main operation
  }
};

/**
 * Service for managing plant data in Firestore
 */
export class PlantService {
  private static readonly COLLECTION_NAME = 'plants';

  /**
   * Create a new plant
   */
  static async createPlant(plantData: Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const collectionPath = FirestoreService.getUserCollectionPath(plantData.userId, this.COLLECTION_NAME);
      
      const plantToCreate = {
        ...plantData,
        photos: plantData.photos || [],
        careTasks: plantData.careTasks || [],
      };

      return await FirestoreService.createDocument(collectionPath, plantToCreate);
    } catch (error) {
      console.error('Error creating plant:', error);
      throw new Error(`Failed to create plant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a plant by ID
   */
  static async getPlant(userId: string, plantId: string): Promise<Plant | null> {
    try {
      const collectionPath = FirestoreService.getUserCollectionPath(userId, this.COLLECTION_NAME);
      const plant = await FirestoreService.getDocument<Plant>(collectionPath, plantId);
      
      if (plant) {
        // Convert Firestore timestamps to Date objects
        return this.convertTimestamps(plant);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting plant:', error);
      throw new Error(`Failed to get plant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all plants for a user with optional filtering
   */
  static async getUserPlants(userId: string, filters?: PlantFilters): Promise<Plant[]> {
    try {
      const collectionPath = FirestoreService.getUserCollectionPath(userId, this.COLLECTION_NAME);
      const constraints: any[] = [QueryHelpers.orderByCreated('desc')];

      // Add filters if provided
      if (filters?.species) {
        constraints.push(where('species', '==', filters.species));
      }
      
      if (filters?.hasCareTasks !== undefined) {
        if (filters.hasCareTasks) {
          constraints.push(where('careTasks', '!=', []));
        }
      }

      const plants = await FirestoreService.getDocuments<Plant>(collectionPath, constraints);
      
      // Convert timestamps and apply client-side filters
      let filteredPlants = plants.map(plant => this.convertTimestamps(plant));

      // Apply search filter (client-side since Firestore doesn't support full-text search)
      if (filters?.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        filteredPlants = filteredPlants.filter(plant => 
          plant.name.toLowerCase().includes(searchTerm) ||
          plant.species?.toLowerCase().includes(searchTerm) ||
          plant.description.toLowerCase().includes(searchTerm)
        );
      }

      return filteredPlants;
    } catch (error) {
      console.error('Error getting user plants:', error);
      throw new Error(`Failed to get plants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a plant
   */
  static async updatePlant(userId: string, plantId: string, updates: Partial<Plant>): Promise<void> {
    try {
      const collectionPath = FirestoreService.getUserCollectionPath(userId, this.COLLECTION_NAME);
      
      // Remove fields that shouldn't be updated directly
      const { id, createdAt, updatedAt, ...updateData } = updates;
      
      await FirestoreService.updateDocument(collectionPath, plantId, updateData);
    } catch (error) {
      console.error('Error updating plant:', error);
      throw new Error(`Failed to update plant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a plant and all associated photos
   */
  static async deletePlant(userId: string, plantId: string): Promise<void> {
    try {
      // First get the plant to access photo URLs for cleanup
      const plant = await this.getPlant(userId, plantId);
      
      if (plant) {
        // Delete all associated photos from storage
        for (const photo of plant.photos) {
          try {
            // Extract file path from URL for deletion
            const photoPath = StorageService.getPlantPhotoPath(userId, plantId, photo.id, 'jpg');
            await StorageService.deleteFile(photoPath);
          } catch (photoError) {
            console.warn(`Failed to delete photo ${photo.id}:`, photoError);
            // Continue with plant deletion even if photo deletion fails
          }
        }
      }

      // Delete the plant document
      const collectionPath = FirestoreService.getUserCollectionPath(userId, this.COLLECTION_NAME);
      await FirestoreService.deleteDocument(collectionPath, plantId);
    } catch (error) {
      console.error('Error deleting plant:', error);
      throw new Error(`Failed to delete plant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a photo to a plant
   */
  static async addPhotoToPlant(
    userId: string, 
    plantId: string, 
    file: File, 
    description?: string
  ): Promise<PlantPhoto> {
    try {
      // Import image utilities dynamically
      const { processImage, generateThumbnail, validateImageFile } = await import('../utils/imageUtils');
      
      // Validate the image file
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Generate unique photo ID
      const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Process the main image (optimize for web)
      const processedImage = await processImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        format: 'jpeg'
      });

      // Generate thumbnail
      const thumbnail = await generateThumbnail(file, 300);
      
      // Upload both images to storage
      const photoPath = StorageService.getPlantPhotoPath(userId, plantId, photoId, 'jpg');
      const thumbnailPath = StorageService.getPlantPhotoPath(userId, plantId, `${photoId}_thumb`, 'jpg');
      
      const [photoUrl, thumbnailUrl] = await Promise.all([
        StorageService.uploadFile(photoPath, processedImage),
        StorageService.uploadFile(thumbnailPath, thumbnail)
      ]);
      
      // Create photo object
      const newPhoto: PlantPhoto = {
        id: photoId,
        url: photoUrl,
        thumbnailUrl: thumbnailUrl,
        uploadedAt: new Date(),
        description,
      };

      // Get current plant to update photos array
      const plant = await this.getPlant(userId, plantId);
      if (!plant) {
        throw new Error('Plant not found');
      }

      // Add photo to plant's photos array
      const updatedPhotos = [...plant.photos, newPhoto];
      await this.updatePlant(userId, plantId, { photos: updatedPhotos });

      return newPhoto;
    } catch (error) {
      console.error('Error adding photo to plant:', error);
      throw new Error(`Failed to add photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove a photo from a plant
   */
  static async removePhotoFromPlant(userId: string, plantId: string, photoId: string): Promise<void> {
    try {
      // Get current plant
      const plant = await this.getPlant(userId, plantId);
      if (!plant) {
        throw new Error('Plant not found');
      }

      // Find and remove photo from array
      const photoToRemove = plant.photos.find(photo => photo.id === photoId);
      if (!photoToRemove) {
        throw new Error('Photo not found');
      }

      // Delete photo from storage
      try {
        const extension = photoToRemove.url.split('.').pop()?.toLowerCase() || 'jpg';
        const photoPath = StorageService.getPlantPhotoPath(userId, plantId, photoId, extension);
        await StorageService.deleteFile(photoPath);
      } catch (storageError) {
        console.warn(`Failed to delete photo from storage:`, storageError);
        // Continue with removing from database even if storage deletion fails
      }

      // Update plant with photo removed
      const updatedPhotos = plant.photos.filter(photo => photo.id !== photoId);
      await this.updatePlant(userId, plantId, { photos: updatedPhotos });
    } catch (error) {
      console.error('Error removing photo from plant:', error);
      throw new Error(`Failed to remove photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a care task to a plant
   */
  static async addCareTaskToPlant(userId: string, plantId: string, careTask: Omit<PlantCareTask, 'id' | 'plantId'>): Promise<PlantCareTask> {
    try {
      // Generate unique task ID
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create care task object
      const newCareTask: PlantCareTask = {
        id: taskId,
        plantId,
        ...careTask,
      };

      // Add care task to plant's careTasks array
      const plant = await this.getPlant(userId, plantId);
      if (!plant) {
        throw new Error('Plant not found');
      }
      const updatedCareTasks = [...plant.careTasks, newCareTask];
      await this.updatePlant(userId, plantId, { careTasks: updatedCareTasks });

      // Create calendar event for the new care task
      await createPlantCareCalendarEvent(userId, plant, newCareTask);

      return newCareTask;
    } catch (error) {
      console.error('Error adding care task to plant:', error);
      throw new Error(`Failed to add care task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a care task for a plant
   */
  static async updatePlantCareTask(
    userId: string, 
    plantId: string, 
    taskId: string, 
    updates: Partial<PlantCareTask>
  ): Promise<void> {
    try {
      // Get current plant
      const plant = await this.getPlant(userId, plantId);
      if (!plant) {
        throw new Error('Plant not found');
      }

      // Find the existing task
      const existingTask = plant.careTasks.find(task => task.id === taskId);
      if (!existingTask) {
        throw new Error('Care task not found');
      }

      // Find and update the care task
      const updatedCareTasks = plant.careTasks.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      );

      await this.updatePlant(userId, plantId, { careTasks: updatedCareTasks });

      // Update calendar event for the care task
      const updatedTask = updatedCareTasks.find(task => task.id === taskId);
      if (updatedTask) {
        await updatePlantCareCalendarEvent(userId, plant, updatedTask);
      }
    } catch (error) {
      console.error('Error updating plant care task:', error);
      throw new Error(`Failed to update care task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove a care task from a plant
   */
  static async removeCareTaskFromPlant(userId: string, plantId: string, taskId: string): Promise<void> {
    try {
      // Delete calendar event first
      await deletePlantCareCalendarEvent(userId, plantId, taskId);

      // Get current plant
      const plant = await this.getPlant(userId, plantId);
      if (!plant) {
        throw new Error('Plant not found');
      }

      // Remove care task from array
      const updatedCareTasks = plant.careTasks.filter(task => task.id !== taskId);

      await this.updatePlant(userId, plantId, { careTasks: updatedCareTasks });
    } catch (error) {
      console.error('Error removing care task from plant:', error);
      throw new Error(`Failed to remove care task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all care tasks for a plant
   */
  static async getPlantCareTasks(userId: string, plantId: string): Promise<PlantCareTask[]> {
    try {
      const plant = await this.getPlant(userId, plantId);
      return plant?.careTasks || [];
    } catch (error) {
      console.error('Error getting plant care tasks:', error);
      throw new Error(`Failed to get care tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert Firestore timestamps to Date objects
   */
  private static convertTimestamps(plant: any): Plant {
    return {
      ...plant,
      createdAt: plant.createdAt?.toDate ? plant.createdAt.toDate() : new Date(plant.createdAt),
      updatedAt: plant.updatedAt?.toDate ? plant.updatedAt.toDate() : new Date(plant.updatedAt),
      photos: plant.photos?.map((photo: any) => ({
        ...photo,
        uploadedAt: photo.uploadedAt?.toDate ? photo.uploadedAt.toDate() : new Date(photo.uploadedAt),
      })) || [],
      careTasks: plant.careTasks?.map((task: any) => ({
        ...task,
        dueDate: task.dueDate?.toDate ? task.dueDate.toDate() : new Date(task.dueDate),
        recurrence: task.recurrence ? {
          ...task.recurrence,
          endDate: task.recurrence.endDate?.toDate ? task.recurrence.endDate.toDate() : task.recurrence.endDate,
        } : undefined,
      })) || [],
    };
  }

  /**
   * Validate plant data before creation/update
   */
  static validatePlantData(plantData: Partial<Plant>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (plantData.name !== undefined) {
      if (!plantData.name || plantData.name.trim().length === 0) {
        errors.push('Plant name is required');
      } else if (plantData.name.length > 100) {
        errors.push('Plant name must be less than 100 characters');
      }
    }

    if (plantData.description !== undefined) {
      if (!plantData.description || plantData.description.trim().length === 0) {
        errors.push('Plant description is required');
      } else if (plantData.description.length > 1000) {
        errors.push('Plant description must be less than 1000 characters');
      }
    }

    if (plantData.species !== undefined && plantData.species && plantData.species.length > 100) {
      errors.push('Plant species must be less than 100 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}