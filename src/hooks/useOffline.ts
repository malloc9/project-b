import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { syncService } from '../services/syncService';
import type { SyncStatus, SyncResult } from '../services/syncService';
import { offlineStorage } from '../utils/offlineStorage';

export interface OfflineHookResult {
  // Status
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  pendingOperations: number;
  
  // Actions
  sync: () => Promise<SyncResult>;
  clearOfflineData: () => void;
  
  // Storage info
  storageInfo: {
    used: number;
    available: number;
  };
  
  // Offline operations
  addOfflineOperation: (
    type: 'create' | 'update' | 'delete',
    collection: string,
    documentId: string,
    data?: any
  ) => void;
}

export const useOffline = (): OfflineHookResult => {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getSyncStatus());
  const [storageInfo, setStorageInfo] = useState(syncService.getStorageInfo());

  // Subscribe to sync status changes
  useEffect(() => {
    const unsubscribe = syncService.onSyncStatusChange(setSyncStatus);
    return unsubscribe;
  }, []);

  // Update storage info periodically
  useEffect(() => {
    const updateStorageInfo = () => {
      setStorageInfo(syncService.getStorageInfo());
    };

    updateStorageInfo();
    const interval = setInterval(updateStorageInfo, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Sync function
  const sync = useCallback(async (): Promise<SyncResult> => {
    if (!user) {
      return {
        success: false,
        syncedOperations: 0,
        conflicts: 0,
        errors: ['User not authenticated']
      };
    }

    return syncService.forceSync(user.uid);
  }, [user]);

  // Clear offline data
  const clearOfflineData = useCallback(() => {
    syncService.clearOfflineData();
    setStorageInfo(syncService.getStorageInfo());
  }, []);

  // Add offline operation
  const addOfflineOperation = useCallback((
    type: 'create' | 'update' | 'delete',
    collection: string,
    documentId: string,
    data?: any
  ) => {
    if (!user) return;

    offlineStorage.addToSyncQueue({
      type,
      collection: collection as any,
      documentId,
      data,
      userId: user.uid
    });

    // Update storage info after adding operation
    setStorageInfo(syncService.getStorageInfo());
    
    // Update sync status to reflect new pending operation
    setSyncStatus(syncService.getSyncStatus());
  }, [user]);

  return {
    isOnline: syncStatus.isOnline,
    isSyncing: syncStatus.isSyncing,
    lastSync: syncStatus.lastSync,
    pendingOperations: syncStatus.pendingOperations,
    sync,
    clearOfflineData,
    storageInfo,
    addOfflineOperation
  };
};