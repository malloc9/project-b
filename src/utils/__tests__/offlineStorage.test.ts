import { offlineStorage } from '../offlineStorage';
import type { Plant } from '../../types';
import { describe, it, expect, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('OfflineStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Basic Data Operations', () => {
    it('should initialize with empty data', () => {
      const data = offlineStorage.getOfflineData();
      
      expect(data.plants).toEqual({});
      expect(data.projects).toEqual({});
      expect(data.simpleTasks).toEqual({});
      expect(data.plantCareTasks).toEqual({});
      expect(data.subtasks).toEqual({});
      expect(data.lastSync).toBe(0);
      expect(data.pendingOperations).toEqual([]);
    });

    it('should cache and retrieve data', () => {
      const plant: Plant = {
        id: 'plant1',
        userId: 'user1',
        name: 'Test Plant',
        description: 'A test plant',
        photos: [],
        careTasks: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      offlineStorage.cacheData('plants', 'plant1', plant);
      const retrieved = offlineStorage.getCachedData('plants', 'plant1') as Plant;

      expect(retrieved).toEqual(plant);
    });

    it('should remove cached data', () => {
      const plant: Plant = {
        id: 'plant1',
        userId: 'user1',
        name: 'Test Plant',
        description: 'A test plant',
        photos: [],
        careTasks: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      offlineStorage.cacheData('plants', 'plant1', plant);
      offlineStorage.removeCachedData('plants', 'plant1');
      
      const retrieved = offlineStorage.getCachedData('plants', 'plant1');
      expect(retrieved).toBeNull();
    });

    it('should get all cached data for a collection', () => {
      const plant1: Plant = {
        id: 'plant1',
        userId: 'user1',
        name: 'Plant 1',
        description: 'First plant',
        photos: [],
        careTasks: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const plant2: Plant = {
        id: 'plant2',
        userId: 'user1',
        name: 'Plant 2',
        description: 'Second plant',
        photos: [],
        careTasks: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      offlineStorage.cacheData('plants', 'plant1', plant1);
      offlineStorage.cacheData('plants', 'plant2', plant2);

      const allPlants = offlineStorage.getCachedData('plants') as Record<string, Plant>;
      
      expect(Object.keys(allPlants)).toHaveLength(2);
      expect(allPlants['plant1']).toEqual(plant1);
      expect(allPlants['plant2']).toEqual(plant2);
    });
  });

  describe('Sync Queue Operations', () => {
    it('should add operations to sync queue', () => {
      const operation = {
        type: 'create' as const,
        collection: 'plants' as const,
        documentId: 'plant1',
        data: { name: 'Test Plant' },
        userId: 'user1'
      };

      offlineStorage.addToSyncQueue(operation);
      const pending = offlineStorage.getPendingOperations();

      expect(pending).toHaveLength(1);
      expect(pending[0]).toMatchObject(operation);
      expect(pending[0].id).toBeDefined();
      expect(pending[0].timestamp).toBeDefined();
    });

    it('should remove operations from sync queue', () => {
      const operation = {
        type: 'create' as const,
        collection: 'plants' as const,
        documentId: 'plant1',
        data: { name: 'Test Plant' },
        userId: 'user1'
      };

      offlineStorage.addToSyncQueue(operation);
      const pending = offlineStorage.getPendingOperations();
      const operationId = pending[0].id;

      offlineStorage.removeFromSyncQueue(operationId);
      const updatedPending = offlineStorage.getPendingOperations();

      expect(updatedPending).toHaveLength(0);
    });

    it('should clear all pending operations', () => {
      offlineStorage.addToSyncQueue({
        type: 'create',
        collection: 'plants',
        documentId: 'plant1',
        data: { name: 'Plant 1' },
        userId: 'user1'
      });

      offlineStorage.addToSyncQueue({
        type: 'update',
        collection: 'plants',
        documentId: 'plant2',
        data: { name: 'Plant 2' },
        userId: 'user1'
      });

      expect(offlineStorage.getPendingOperations()).toHaveLength(2);

      offlineStorage.clearSyncQueue();
      expect(offlineStorage.getPendingOperations()).toHaveLength(0);
    });
  });

  describe('Sync Timestamp Management', () => {
    it('should update and retrieve last sync timestamp', () => {
      const beforeUpdate = Date.now();
      offlineStorage.updateLastSync();
      const afterUpdate = Date.now();

      const lastSync = offlineStorage.getLastSync();
      
      expect(lastSync).toBeGreaterThanOrEqual(beforeUpdate);
      expect(lastSync).toBeLessThanOrEqual(afterUpdate);
    });

    it('should return 0 for last sync when no sync has occurred', () => {
      const lastSync = offlineStorage.getLastSync();
      expect(lastSync).toBe(0);
    });
  });

  describe('Storage Management', () => {
    it('should clear all data', () => {
      // Add some data
      offlineStorage.cacheData('plants', 'plant1', { name: 'Test Plant' });
      offlineStorage.addToSyncQueue({
        type: 'create',
        collection: 'plants',
        documentId: 'plant1',
        userId: 'user1'
      });
      offlineStorage.updateLastSync();

      // Clear all data
      offlineStorage.clearAllData();

      // Verify everything is cleared
      const data = offlineStorage.getOfflineData();
      expect(data.plants).toEqual({});
      expect(data.pendingOperations).toEqual([]);
      expect(data.lastSync).toBe(0);
    });

    it('should provide storage usage information', () => {
      const info = offlineStorage.getStorageInfo();
      
      expect(info).toHaveProperty('used');
      expect(info).toHaveProperty('available');
      expect(typeof info.used).toBe('number');
      expect(typeof info.available).toBe('number');
      expect(info.used).toBeGreaterThanOrEqual(0);
      expect(info.available).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle corrupted localStorage data gracefully', () => {
      // Manually set corrupted data
      localStorage.setItem('household_management_offline_data', 'invalid json');

      const data = offlineStorage.getOfflineData();
      
      // Should return empty data structure instead of throwing
      expect(data.plants).toEqual({});
      expect(data.projects).toEqual({});
      expect(data.lastSync).toBe(0);
    });
  });
});