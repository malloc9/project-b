import { useState, useEffect, useCallback } from 'react';
import { serviceWorkerManager } from '../utils/serviceWorkerManager';
import type { UpdateError } from '../utils/serviceWorkerManager';

export interface UpdateStatus {
  available: boolean;
  downloading: boolean;
  ready: boolean;
  installing: boolean;
  error: string | null;
  version: string | null;
  lastChecked: Date | null;
}

export interface ServiceWorkerHookResult {
  isSupported: boolean;
  isOnline: boolean;
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  
  // Enhanced update management state
  updateStatus: UpdateStatus;
  isUpdating: boolean;
  updateError: string | null;
  
  // Actions
  register: () => Promise<ServiceWorkerRegistration | null>;
  unregister: () => Promise<boolean>;
  update: () => Promise<void>;
  activateUpdate: () => void;
  requestBackgroundSync: (tag: string) => Promise<void>;
  cacheUrls: (urls: string[]) => Promise<boolean>;
  clearCache: () => Promise<boolean>;
  checkForUpdates: () => Promise<boolean>;
  forceUpdate: () => Promise<void>;
  getCurrentCacheVersion: () => Promise<string | null>;
  clearOldCaches: () => Promise<boolean>;
  
  // Enhanced update management methods
  checkForUpdatesWithStatus: () => Promise<UpdateStatus>;
  activateUpdateWithProgress: () => Promise<void>;
  retryFailedUpdate: () => Promise<void>;
  dismissUpdateError: () => void;
  scheduleUpdateCheck: (intervalMs?: number) => () => void;
  
  // Comprehensive error handling methods
  retryUpdateWithBackoff: (maxRetries?: number) => Promise<void>;
  recoverFromFailedUpdate: () => Promise<boolean>;
  validateServiceWorkerHealth: () => Promise<boolean>;
  getUpdateErrorHistory: () => UpdateError[];
  clearUpdateErrorHistory: () => void;
}

export const useServiceWorker = (): ServiceWorkerHookResult => {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isOnline, setIsOnline] = useState(serviceWorkerManager.isOnline());
  const [updateAvailable, setUpdateAvailable] = useState(false);
  
  // Enhanced update management state
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    available: false,
    downloading: false,
    ready: false,
    installing: false,
    error: null,
    version: null,
    lastChecked: null
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Subscribe to online status changes
  useEffect(() => {
    const unsubscribe = serviceWorkerManager.onOnlineStatusChange(setIsOnline);
    return unsubscribe;
  }, []);

  // Listen for service worker events with enhanced status tracking
  useEffect(() => {
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
      setUpdateStatus(prev => ({
        ...prev,
        available: true,
        ready: true,
        error: null
      }));
    };

    const handleUpdateDownloading = () => {
      setUpdateStatus(prev => ({
        ...prev,
        downloading: true,
        installing: false,
        error: null
      }));
    };

    const handleUpdateInstalling = () => {
      setUpdateStatus(prev => ({
        ...prev,
        downloading: false,
        installing: true,
        error: null
      }));
    };

    const handleUpdateError = (event: CustomEvent) => {
      const error = event.detail?.error || 'Update failed';
      setUpdateError(error);
      setUpdateStatus(prev => ({
        ...prev,
        error,
        downloading: false,
        installing: false
      }));
      setIsUpdating(false);
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);
    window.addEventListener('sw-update-downloading', handleUpdateDownloading);
    window.addEventListener('sw-update-installing', handleUpdateInstalling);
    window.addEventListener('sw-update-error', handleUpdateError as EventListener);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
      window.removeEventListener('sw-update-downloading', handleUpdateDownloading);
      window.removeEventListener('sw-update-installing', handleUpdateInstalling);
      window.removeEventListener('sw-update-error', handleUpdateError as EventListener);
    };
  }, []);

  // Register service worker
  const register = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      const reg = await serviceWorkerManager.register();
      setRegistration(reg);
      return reg;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  }, []);

  // Unregister service worker
  const unregister = useCallback(async (): Promise<boolean> => {
    try {
      const result = await serviceWorkerManager.unregister();
      if (result) {
        setRegistration(null);
      }
      return result;
    } catch (error) {
      console.error('Service worker unregistration failed:', error);
      return false;
    }
  }, []);

  // Update service worker
  const update = useCallback(async (): Promise<void> => {
    return serviceWorkerManager.update();
  }, []);

  // Activate waiting service worker
  const activateUpdate = useCallback(() => {
    serviceWorkerManager.activateWaitingServiceWorker();
    setUpdateAvailable(false);
    // Reload the page to use the new service worker
    window.location.reload();
  }, []);

  // Request background sync
  const requestBackgroundSync = useCallback(async (tag: string): Promise<void> => {
    return serviceWorkerManager.requestBackgroundSync(tag);
  }, []);

  // Cache URLs
  const cacheUrls = useCallback(async (urls: string[]): Promise<boolean> => {
    return serviceWorkerManager.cacheUrls(urls);
  }, []);

  // Clear cache
  const clearCache = useCallback(async (): Promise<boolean> => {
    return serviceWorkerManager.clearCache();
  }, []);

  // Check for updates
  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    return serviceWorkerManager.checkForUpdates();
  }, []);

  // Force update
  const forceUpdate = useCallback(async (): Promise<void> => {
    await serviceWorkerManager.forceUpdate();
    setUpdateAvailable(false);
    // Reload the page to use the new service worker
    window.location.reload();
  }, []);

  // Get current cache version
  const getCurrentCacheVersion = useCallback(async (): Promise<string | null> => {
    return serviceWorkerManager.getCurrentCacheVersion();
  }, []);

  // Clear old caches
  const clearOldCaches = useCallback(async (): Promise<boolean> => {
    return serviceWorkerManager.clearOldCaches();
  }, []);

  // Enhanced update management methods
  const checkForUpdatesWithStatus = useCallback(async (): Promise<UpdateStatus> => {
    try {
      setUpdateStatus(prev => ({ ...prev, error: null }));
      
      const hasUpdate = await serviceWorkerManager.checkForUpdates();
      const version = await serviceWorkerManager.getCurrentCacheVersion();
      const now = new Date();
      
      const newStatus: UpdateStatus = {
        available: hasUpdate,
        downloading: false,
        ready: hasUpdate,
        installing: false,
        error: null,
        version,
        lastChecked: now
      };
      
      setUpdateStatus(newStatus);
      setUpdateAvailable(hasUpdate);
      
      return newStatus;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check for updates';
      const errorStatus: UpdateStatus = {
        ...updateStatus,
        error: errorMessage,
        lastChecked: new Date()
      };
      
      setUpdateStatus(errorStatus);
      setUpdateError(errorMessage);
      
      return errorStatus;
    }
  }, [updateStatus]);

  const activateUpdateWithProgress = useCallback(async (): Promise<void> => {
    try {
      setIsUpdating(true);
      setUpdateError(null);
      setUpdateStatus(prev => ({
        ...prev,
        installing: true,
        error: null
      }));

      await serviceWorkerManager.forceUpdate();
      
      setUpdateStatus(prev => ({
        ...prev,
        available: false,
        ready: false,
        installing: false,
        downloading: false
      }));
      setUpdateAvailable(false);
      setIsUpdating(false);
      
      // Reload the page to use the new service worker
      window.location.reload();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to activate update';
      setUpdateError(errorMessage);
      setUpdateStatus(prev => ({
        ...prev,
        error: errorMessage,
        installing: false,
        downloading: false
      }));
      setIsUpdating(false);
      throw error;
    }
  }, []);

  const retryFailedUpdate = useCallback(async (): Promise<void> => {
    try {
      setUpdateError(null);
      setUpdateStatus(prev => ({
        ...prev,
        error: null
      }));

      // First check for updates again
      const hasUpdate = await checkForUpdatesWithStatus();
      
      if (hasUpdate.available) {
        // If update is available, try to activate it
        await activateUpdateWithProgress();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Retry failed';
      setUpdateError(errorMessage);
      setUpdateStatus(prev => ({
        ...prev,
        error: errorMessage
      }));
    }
  }, [checkForUpdatesWithStatus, activateUpdateWithProgress]);

  const dismissUpdateError = useCallback(() => {
    setUpdateError(null);
    setUpdateStatus(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  const scheduleUpdateCheck = useCallback((intervalMs: number = 30000): (() => void) => {
    const intervalId = setInterval(() => {
      // Only check for updates if we're online and not currently updating
      if (isOnline && !isUpdating) {
        checkForUpdatesWithStatus().catch(error => {
          console.warn('Scheduled update check failed:', error);
        });
      }
    }, intervalMs);

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
    };
  }, [isOnline, isUpdating, checkForUpdatesWithStatus]);

  // Comprehensive error handling methods
  const retryUpdateWithBackoff = useCallback(async (maxRetries?: number): Promise<void> => {
    try {
      setIsUpdating(true);
      setUpdateError(null);
      setUpdateStatus(prev => ({
        ...prev,
        error: null,
        installing: true
      }));

      await serviceWorkerManager.retryUpdate(maxRetries);
      
      setUpdateStatus(prev => ({
        ...prev,
        available: false,
        ready: false,
        installing: false,
        downloading: false
      }));
      setUpdateAvailable(false);
      setIsUpdating(false);
      
      // Reload the page to use the new service worker
      window.location.reload();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Retry with backoff failed';
      setUpdateError(errorMessage);
      setUpdateStatus(prev => ({
        ...prev,
        error: errorMessage,
        installing: false,
        downloading: false
      }));
      setIsUpdating(false);
      throw error;
    }
  }, []);

  const recoverFromFailedUpdate = useCallback(async (): Promise<boolean> => {
    try {
      setUpdateError(null);
      setUpdateStatus(prev => ({
        ...prev,
        error: null
      }));

      const recovered = await serviceWorkerManager.recoverFromFailedUpdate();
      
      if (recovered) {
        // Re-check for updates after recovery
        await checkForUpdatesWithStatus();
      } else {
        const errorMessage = 'Failed to recover from update failure';
        setUpdateError(errorMessage);
        setUpdateStatus(prev => ({
          ...prev,
          error: errorMessage
        }));
      }
      
      return recovered;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Recovery failed';
      setUpdateError(errorMessage);
      setUpdateStatus(prev => ({
        ...prev,
        error: errorMessage
      }));
      return false;
    }
  }, [checkForUpdatesWithStatus]);

  const validateServiceWorkerHealth = useCallback(async (): Promise<boolean> => {
    try {
      const isHealthy = await serviceWorkerManager.validateServiceWorkerHealth();
      
      if (!isHealthy) {
        const errorMessage = 'Service worker health check failed';
        setUpdateError(errorMessage);
        setUpdateStatus(prev => ({
          ...prev,
          error: errorMessage
        }));
      }
      
      return isHealthy;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Health validation failed';
      setUpdateError(errorMessage);
      setUpdateStatus(prev => ({
        ...prev,
        error: errorMessage
      }));
      return false;
    }
  }, []);

  const getUpdateErrorHistory = useCallback((): UpdateError[] => {
    return serviceWorkerManager.getUpdateErrorHistory();
  }, []);

  const clearUpdateErrorHistory = useCallback((): void => {
    serviceWorkerManager.clearUpdateErrorHistory();
    setUpdateError(null);
    setUpdateStatus(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  return {
    isSupported: serviceWorkerManager.isSupported(),
    isOnline,
    registration,
    updateAvailable,
    updateStatus,
    isUpdating,
    updateError,
    register,
    unregister,
    update,
    activateUpdate,
    requestBackgroundSync,
    cacheUrls,
    clearCache,
    checkForUpdates,
    forceUpdate,
    getCurrentCacheVersion,
    clearOldCaches,
    checkForUpdatesWithStatus,
    activateUpdateWithProgress,
    retryFailedUpdate,
    dismissUpdateError,
    scheduleUpdateCheck,
    retryUpdateWithBackoff,
    recoverFromFailedUpdate,
    validateServiceWorkerHealth,
    getUpdateErrorHistory,
    clearUpdateErrorHistory
  };
};