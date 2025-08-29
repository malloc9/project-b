import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { offlineStorage } from '../utils/offlineStorage';
// import type { OfflineOperation } from '../utils/offlineStorage';
// import { conflictResolver, ConflictData } from '../utils/conflictResolution';
import { Plant, Project, SimpleTask, PlantCareTask, Subtask } from '../types';

export interface SyncResult {
  success: boolean;
  syncedOperations: number;
  conflicts: number;
  errors: string[];
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  pendingOperations: number;
  hasConflicts: boolean;
}

class SyncService {
  private isOnline = navigator.onLine;
  private isSyncing = false;
  private syncListeners: ((status: SyncStatus) => void)[] = [];

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyStatusChange();
      this.syncWhenOnline();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyStatusChange();
    });
  }

  // Get current sync status
  getSyncStatus(): SyncStatus {
    const lastSync = offlineStorage.getLastSync();
    const pendingOperations = offlineStorage.getPendingOperations();

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSync: lastSync > 0 ? new Date(lastSync) : null,
      pendingOperations: pendingOperations.length,
      hasConflicts: false // TODO: Track conflicts
    };
  }

  // Subscribe to sync status changes
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.syncListeners.indexOf(callback);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  // Notify listeners of status changes
  private notifyStatusChange(): void {
    const status = this.getSyncStatus();
    this.syncListeners.forEach(listener => listener(status));
  }

  // Sync all pending operations
  async syncAll(userId: string): Promise<SyncResult> {
    if (!this.isOnline || this.isSyncing) {
      return {
        success: false,
        syncedOperations: 0,
        conflicts: 0,
        errors: ['Not online or already syncing']
      };
    }

    this.isSyncing = true;
    this.notifyStatusChange();

    try {
      // First, pull remote changes and resolve conflicts
      await this.pullRemoteChanges(userId);

      // Then, push local changes
      const result = await this.pushLocalChanges(userId);

      // Update last sync timestamp
      offlineStorage.updateLastSync();

      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      return {
        success: false,
        syncedOperations: 0,
        conflicts: 0,
        errors: [error instanceof Error ? error.message : 'Unknown sync error']
      };
    } finally {
      this.isSyncing = false;
      this.notifyStatusChange();
    }
  }

  // Pull remote changes and resolve conflicts
  private async pullRemoteChanges(userId: string): Promise<void> {
    const lastSync = offlineStorage.getLastSync();
    const collections = ['plants', 'projects', 'simpleTasks', 'plantCareTasks', 'subtasks'];

    for (const collectionName of collections) {
      await this.pullCollectionChanges(userId, collectionName, lastSync);
    }
  }

  // Pull changes for a specific collection
  private async pullCollectionChanges(
    userId: string, 
    collectionName: string, 
    lastSync: number
  ): Promise<void> {
    try {
      const collectionRef = collection(db, 'users', userId, collectionName);
      let q = query(collectionRef, orderBy('updatedAt', 'desc'));

      // If we have a last sync time, only get documents updated since then
      if (lastSync > 0) {
        q = query(
          collectionRef,
          where('updatedAt', '>', Timestamp.fromMillis(lastSync)),
          orderBy('updatedAt', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      
      for (const docSnapshot of snapshot.docs) {
        const remoteData = { id: docSnapshot.id, ...docSnapshot.data() };
        const localData = offlineStorage.getCachedData(
          collectionName as keyof any, 
          docSnapshot.id
        );

        if (localData) {
          // Conflict resolution needed
          await this.resolveConflict(collectionName, localData, remoteData);
        } else {
          // No local version, just cache the remote data
          offlineStorage.cacheData(collectionName as keyof any, docSnapshot.id, remoteData);
        }
      }
    } catch (error) {
      console.error(`Failed to pull ${collectionName} changes:`, error);
    }
  }

  // Resolve conflicts between local and remote data
  private async resolveConflict(
    collectionName: string,
    localData: any,
    remoteData: any
  ): Promise<void> {
    // Temporarily disabled conflict resolution
    console.log('Conflict detected but resolution is disabled:', { collectionName });
    
    // For now, just use the remote data
    const resolution = {
      resolved: remoteData,
      strategy: 'remote' as const
    };

    // Cache the resolved data
    offlineStorage.cacheData(
      collectionName as keyof any, 
      resolution.resolved.id, 
      resolution.resolved
    );

    /*
    const conflict: ConflictData<any> = {
      local: localData,
      remote: remoteData,
      lastSync: offlineStorage.getLastSync()
    };

    let resolution;
    
    switch (collectionName) {
      case 'plants':
        resolution = conflictResolver.resolvePlantConflict(conflict);
        break;
      case 'projects':
        resolution = conflictResolver.resolveProjectConflict(conflict);
        break;
      case 'simpleTasks':
        resolution = conflictResolver.resolveSimpleTaskConflict(conflict);
        break;
      case 'plantCareTasks':
        resolution = conflictResolver.resolveCareTaskConflict(conflict);
        break;
      case 'subtasks':
        resolution = conflictResolver.resolveSubtaskConflict(conflict);
        break;
      default:
        // Default to timestamp resolution
        resolution = conflictResolver.resolveByTimestamp(conflict);
    }

    // If we used local data, add an update operation to sync queue
    if (resolution.strategy === 'local' || resolution.strategy === 'merge') {
      offlineStorage.addToSyncQueue({
        type: 'update',
        collection: collectionName as any,
        documentId: resolution.resolved.id,
        data: resolution.resolved,
        userId: resolution.resolved.userId
      });
    }
    */
  }

  // Push local changes to remote
  private async pushLocalChanges(userId: string): Promise<SyncResult> {
    const pendingOperations = offlineStorage.getPendingOperations();
    let syncedOperations = 0;
    let conflicts = 0;
    const errors: string[] = [];

    for (const operation of pendingOperations) {
      try {
        await this.executeOperation(operation);
        offlineStorage.removeFromSyncQueue(operation.id);
        syncedOperations++;
      } catch (error) {
        console.error('Failed to execute operation:', operation, error);
        errors.push(`Failed to ${operation.type} ${operation.collection}/${operation.documentId}`);
        
        // Don't remove failed operations, they'll be retried next sync
      }
    }

    return {
      success: errors.length === 0,
      syncedOperations,
      conflicts,
      errors
    };
  }

  // Execute a single offline operation
  private async executeOperation(operation: any): Promise<void> {
    const docRef = doc(db, 'users', operation.userId, operation.collection, operation.documentId);

    switch (operation.type) {
      case 'create':
      case 'update':
        if (operation.data) {
          // Convert Date objects to Firestore Timestamps
          const firestoreData = this.convertDatesToTimestamps(operation.data);
          await setDoc(docRef, firestoreData, { merge: operation.type === 'update' });
        }
        break;
        
      case 'delete':
        await deleteDoc(docRef);
        break;
        
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  // Convert Date objects to Firestore Timestamps
  private convertDatesToTimestamps(data: any): any {
    if (data instanceof Date) {
      return Timestamp.fromDate(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.convertDatesToTimestamps(item));
    }
    
    if (data && typeof data === 'object') {
      const converted: any = {};
      for (const [key, value] of Object.entries(data)) {
        converted[key] = this.convertDatesToTimestamps(value);
      }
      return converted;
    }
    
    return data;
  }

  // Sync when coming back online
  private async syncWhenOnline(): Promise<void> {
    if (this.isOnline && !this.isSyncing) {
      // Wait a bit to ensure connection is stable
      setTimeout(() => {
        const pendingOperations = offlineStorage.getPendingOperations();
        if (pendingOperations.length > 0) {
          // Get user ID from auth context (this would need to be passed in)
          // For now, we'll need to trigger sync from components that have access to user
          this.notifyStatusChange();
        }
      }, 1000);
    }
  }

  // Force sync (for manual sync buttons)
  async forceSync(userId: string): Promise<SyncResult> {
    return this.syncAll(userId);
  }

  // Clear all offline data (for logout)
  clearOfflineData(): void {
    offlineStorage.clearAllData();
    this.notifyStatusChange();
  }

  // Get storage usage information
  getStorageInfo() {
    return offlineStorage.getStorageInfo();
  }
}

export const syncService = new SyncService();