import type { Plant, Project, SimpleTask, PlantCareTask, Subtask } from '../types';

export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: 'plants' | 'projects' | 'simpleTasks' | 'plantCareTasks' | 'subtasks';
  documentId: string;
  data?: any;
  timestamp: number;
  userId: string;
}

export interface OfflineData {
  plants: Record<string, Plant>;
  projects: Record<string, Project>;
  simpleTasks: Record<string, SimpleTask>;
  plantCareTasks: Record<string, PlantCareTask>;
  subtasks: Record<string, Subtask>;
  lastSync: number;
  pendingOperations: OfflineOperation[];
}

class OfflineStorageManager {
  private readonly STORAGE_KEY = 'household_management_offline_data';
  private readonly SYNC_QUEUE_KEY = 'household_management_sync_queue';

  // Get offline data from localStorage
  getOfflineData(): OfflineData {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      return this.getEmptyOfflineData();
    }
    
    try {
      const parsed = JSON.parse(stored);
      return this.reviveDates(parsed);
    } catch (error) {
      console.error('Failed to parse offline data:', error);
      return this.getEmptyOfflineData();
    }
  }

  // Save offline data to localStorage
  saveOfflineData(data: OfflineData): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save offline data:', error);
      // Handle storage quota exceeded
      this.clearOldData();
    }
  }

  // Get empty offline data structure
  private getEmptyOfflineData(): OfflineData {
    return {
      plants: {},
      projects: {},
      simpleTasks: {},
      plantCareTasks: {},
      subtasks: {},
      lastSync: 0,
      pendingOperations: []
    };
  }

  // Cache data for offline access
  cacheData<T>(collection: keyof OfflineData, documentId: string, data: T): void {
    const offlineData = this.getOfflineData();
    
    if (collection === 'pendingOperations' || collection === 'lastSync') {
      return; // Skip these special fields
    }
    
    (offlineData[collection] as Record<string, T>)[documentId] = data;
    this.saveOfflineData(offlineData);
  }

  // Get cached data
  getCachedData<T>(collection: keyof OfflineData, documentId?: string): T | Record<string, T> | null {
    const offlineData = this.getOfflineData();
    
    if (collection === 'pendingOperations' || collection === 'lastSync') {
      return offlineData[collection] as T;
    }
    
    const collectionData = offlineData[collection] as Record<string, T>;
    
    if (documentId) {
      return collectionData[documentId] || null;
    }
    
    return collectionData;
  }

  // Remove cached data
  removeCachedData(collection: keyof OfflineData, documentId: string): void {
    const offlineData = this.getOfflineData();
    
    if (collection === 'pendingOperations' || collection === 'lastSync') {
      return;
    }
    
    delete (offlineData[collection] as Record<string, any>)[documentId];
    this.saveOfflineData(offlineData);
  }

  // Add operation to sync queue
  addToSyncQueue(operation: Omit<OfflineOperation, 'id' | 'timestamp'>): void {
    const offlineData = this.getOfflineData();
    const newOperation: OfflineOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: Date.now()
    };
    
    offlineData.pendingOperations.push(newOperation);
    this.saveOfflineData(offlineData);
  }

  // Get pending operations
  getPendingOperations(): OfflineOperation[] {
    const offlineData = this.getOfflineData();
    return offlineData.pendingOperations;
  }

  // Remove operation from sync queue
  removeFromSyncQueue(operationId: string): void {
    const offlineData = this.getOfflineData();
    offlineData.pendingOperations = offlineData.pendingOperations.filter(
      op => op.id !== operationId
    );
    this.saveOfflineData(offlineData);
  }

  // Clear all pending operations
  clearSyncQueue(): void {
    const offlineData = this.getOfflineData();
    offlineData.pendingOperations = [];
    this.saveOfflineData(offlineData);
  }

  // Update last sync timestamp
  updateLastSync(): void {
    const offlineData = this.getOfflineData();
    offlineData.lastSync = Date.now();
    this.saveOfflineData(offlineData);
  }

  // Get last sync timestamp
  getLastSync(): number {
    const offlineData = this.getOfflineData();
    return offlineData.lastSync;
  }

  // Clear old data to free up storage space
  private clearOldData(): void {
    const offlineData = this.getOfflineData();
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Remove operations older than a week
    offlineData.pendingOperations = offlineData.pendingOperations.filter(
      op => op.timestamp > oneWeekAgo
    );
    
    this.saveOfflineData(offlineData);
  }

  // Generate unique operation ID
  private generateOperationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Revive Date objects from JSON using a more targeted approach
  private reviveDates(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.reviveDates(item));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Convert known date fields back to Date objects
      if (this.isDateField(key) && typeof value === 'string') {
        result[key] = new Date(value);
      } else if (typeof value === 'object') {
        result[key] = this.reviveDates(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  // Check if a field name is a known date field
  private isDateField(fieldName: string): boolean {
    const dateFields = ['createdAt', 'updatedAt', 'dueDate', 'uploadedAt'];
    return dateFields.includes(fieldName);
  }

  // Clear all offline data
  clearAllData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.SYNC_QUEUE_KEY);
  }

  // Get storage usage info
  getStorageInfo(): { used: number; available: number } {
    const data = localStorage.getItem(this.STORAGE_KEY) || '';
    const used = new Blob([data]).size;
    
    // Estimate available storage (5MB is typical localStorage limit)
    const estimated = 5 * 1024 * 1024;
    
    return {
      used,
      available: estimated - used
    };
  }
}

export const offlineStorage = new OfflineStorageManager();