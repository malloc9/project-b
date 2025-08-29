import { useState, useEffect, useCallback } from 'react';
import { serviceWorkerManager } from '../utils/serviceWorkerManager';

export interface ServiceWorkerHookResult {
  isSupported: boolean;
  isOnline: boolean;
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  
  // Actions
  register: () => Promise<ServiceWorkerRegistration | null>;
  unregister: () => Promise<boolean>;
  update: () => Promise<void>;
  activateUpdate: () => void;
  requestBackgroundSync: (tag: string) => Promise<void>;
  cacheUrls: (urls: string[]) => Promise<boolean>;
  clearCache: () => Promise<boolean>;
}

export const useServiceWorker = (): ServiceWorkerHookResult => {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isOnline, setIsOnline] = useState(serviceWorkerManager.isOnline());
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Subscribe to online status changes
  useEffect(() => {
    const unsubscribe = serviceWorkerManager.onOnlineStatusChange(setIsOnline);
    return unsubscribe;
  }, []);

  // Listen for service worker events
  useEffect(() => {
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
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

  return {
    isSupported: serviceWorkerManager.isSupported(),
    isOnline,
    registration,
    updateAvailable,
    register,
    unregister,
    update,
    activateUpdate,
    requestBackgroundSync,
    cacheUrls,
    clearCache
  };
};