import { describe, it, expect, beforeEach, vi } from 'vitest';
import { serviceWorkerManager } from '../serviceWorkerManager';

// Mock navigator.serviceWorker
const mockServiceWorker = {
  register: vi.fn(),
  addEventListener: vi.fn(),
  controller: {
    postMessage: vi.fn()
  }
};

const mockRegistration = {
  unregister: vi.fn(),
  update: vi.fn(),
  sync: {
    register: vi.fn()
  },
  addEventListener: vi.fn()
};

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    onLine: true,
    serviceWorker: mockServiceWorker
  },
  writable: true
});

// Mock window events
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
Object.defineProperty(window, 'addEventListener', { value: mockAddEventListener });
Object.defineProperty(window, 'removeEventListener', { value: mockRemoveEventListener });

describe('ServiceWorkerManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset online status
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  describe('Support Detection', () => {
    it('should detect service worker support', () => {
      expect(serviceWorkerManager.isSupported()).toBe(true);
    });

    it('should detect lack of service worker support', () => {
      // Temporarily remove serviceWorker
      const originalSW = (navigator as any).serviceWorker;
      delete (navigator as any).serviceWorker;
      
      expect(serviceWorkerManager.isSupported()).toBe(false);
      
      // Restore
      (navigator as any).serviceWorker = originalSW;
    });
  });

  describe('Online Status', () => {
    it('should return current online status', () => {
      expect(serviceWorkerManager.isOnline()).toBe(true);
    });

    it('should handle online status changes', () => {
      const callback = vi.fn();
      const unsubscribe = serviceWorkerManager.onOnlineStatusChange(callback);

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      // Find the offline event listener and call it
      const offlineListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'offline'
      )?.[1];
      
      if (offlineListener) {
        offlineListener();
      }

      expect(callback).toHaveBeenCalledWith(false);

      // Test unsubscribe
      unsubscribe();
      callback.mockClear();

      // Simulate going online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      const onlineListener = mockAddEventListener.mock.calls.find(
        call => call[0] === 'online'
      )?.[1];
      
      if (onlineListener) {
        onlineListener();
      }

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Service Worker Registration', () => {
    it('should register service worker successfully', async () => {
      mockServiceWorker.register.mockResolvedValue(mockRegistration);

      const registration = await serviceWorkerManager.register();

      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
      expect(registration).toBe(mockRegistration);
    });

    it('should handle registration failure', async () => {
      const error = new Error('Registration failed');
      mockServiceWorker.register.mockRejectedValue(error);

      const registration = await serviceWorkerManager.register();

      expect(registration).toBeNull();
    });

    it('should return null when service workers not supported', async () => {
      // Temporarily remove serviceWorker
      const originalSW = (navigator as any).serviceWorker;
      delete (navigator as any).serviceWorker;

      const registration = await serviceWorkerManager.register();

      expect(registration).toBeNull();

      // Restore
      (navigator as any).serviceWorker = originalSW;
    });
  });

  describe('Service Worker Unregistration', () => {
    it('should unregister service worker successfully', async () => {
      // First register
      mockServiceWorker.register.mockResolvedValue(mockRegistration);
      await serviceWorkerManager.register();

      // Then unregister
      mockRegistration.unregister.mockResolvedValue(true);
      const result = await serviceWorkerManager.unregister();

      expect(mockRegistration.unregister).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle unregistration failure', async () => {
      // First register
      mockServiceWorker.register.mockResolvedValue(mockRegistration);
      await serviceWorkerManager.register();

      // Then fail to unregister
      const error = new Error('Unregistration failed');
      mockRegistration.unregister.mockRejectedValue(error);
      
      const result = await serviceWorkerManager.unregister();

      expect(result).toBe(false);
    });

    it('should return false when no registration exists', async () => {
      const result = await serviceWorkerManager.unregister();
      expect(result).toBe(false);
    });
  });

  describe('Background Sync', () => {
    it('should request background sync successfully', async () => {
      // First register
      mockServiceWorker.register.mockResolvedValue(mockRegistration);
      await serviceWorkerManager.register();

      mockRegistration.sync.register.mockResolvedValue(undefined);

      await serviceWorkerManager.requestBackgroundSync('test-sync');

      expect(mockRegistration.sync.register).toHaveBeenCalledWith('test-sync');
    });

    it('should handle background sync failure', async () => {
      // First register
      mockServiceWorker.register.mockResolvedValue(mockRegistration);
      await serviceWorkerManager.register();

      const error = new Error('Sync failed');
      mockRegistration.sync.register.mockRejectedValue(error);

      await expect(serviceWorkerManager.requestBackgroundSync('test-sync')).rejects.toThrow('Sync failed');
    });

    it('should handle missing sync support', async () => {
      // Register without sync support
      const registrationWithoutSync = { ...mockRegistration };
      (registrationWithoutSync as any).sync = undefined;
      
      mockServiceWorker.register.mockResolvedValue(registrationWithoutSync);
      await serviceWorkerManager.register();

      // Should not throw, just log warning
      await serviceWorkerManager.requestBackgroundSync('test-sync');
    });
  });

  describe('Cache Management', () => {
    it('should cache URLs successfully', async () => {
      const urls = ['/page1', '/page2'];
      
      // Mock MessageChannel
      const mockPort1 = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        postMessage: vi.fn(),
        start: vi.fn(),
        close: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onmessageerror: null,
      };
      const mockPort2 = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        postMessage: vi.fn(),
        start: vi.fn(),
        close: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onmessageerror: null,
      };
      const mockMessageChannel = {
        port1: mockPort1,
        port2: mockPort2,
      };
      
      global.MessageChannel = vi.fn(() => mockMessageChannel);

      const result = serviceWorkerManager.cacheUrls(urls);

      // Simulate successful response
      setTimeout(() => {
        if (mockPort1.onmessage) {
          mockPort1.onmessage({ data: { success: true } } as MessageEvent);
        }
      }, 0);

      expect(await result).toBe(true);
    });

    it('should handle cache failure', async () => {
      const urls = ['/page1', '/page2'];
      
      const mockPort1 = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        postMessage: vi.fn(),
        start: vi.fn(),
        close: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onmessageerror: null,
      };
      const mockPort2 = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        postMessage: vi.fn(),
        start: vi.fn(),
        close: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onmessageerror: null,
      };
      const mockMessageChannel = {
        port1: mockPort1,
        port2: mockPort2,
      };
      
      global.MessageChannel = vi.fn(() => mockMessageChannel);

      const result = serviceWorkerManager.cacheUrls(urls);

      // Simulate failure response
      setTimeout(() => {
        if (mockPort1.onmessage) {
          mockPort1.onmessage({ data: { success: false } } as MessageEvent);
        }
      }, 0);

      expect(await result).toBe(false);
    });

    it('should return false when no active service worker', async () => {
      // Remove controller
      (mockServiceWorker as any).controller = undefined;

      const result = await serviceWorkerManager.cacheUrls(['/page1']);
      expect(result).toBe(false);

      // Restore controller
      mockServiceWorker.controller = { postMessage: vi.fn() };
    });
  });
});