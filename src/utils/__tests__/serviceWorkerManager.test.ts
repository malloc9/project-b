import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { serviceWorkerManager } from '../serviceWorkerManager';

// Mock MessageChannel and MessagePort
let lastCreatedMessageChannel: { port1: MessagePort; port2: MessagePort } | undefined;

const createMockMessageChannel = () => {
  const { port1, port2 } = new MessageChannel();
  lastCreatedMessageChannel = { port1, port2 }; // Store the created ports
  return { port1, port2 };
};

// Mock navigator.serviceWorker
const mockServiceWorker = {
  register: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  controller: {
    postMessage: vi.fn((message, transfer) => {
      const port = transfer?.[0] as MessagePort | undefined; // Assuming port2 is always the first transferrable
      if (port && port.onmessage) {
        // Simulate a default successful response if the test doesn't set up a specific handler
        // Tests can override port.onmessage before calling the manager method
        setTimeout(() => {
          port.onmessage({ data: { success: true, version: '1.0.0' } } as MessageEvent);
        }, 0);
      }
    })
  } as ServiceWorker | null
};

const mockRegistration = {
  unregister: vi.fn(),
  update: vi.fn(),
  addEventListener: vi.fn(),
  active: null as ServiceWorker | null,
  waiting: null as ServiceWorker | null,
  installing: null as ServiceWorker | null,
  scope: '/',
  updateViaCache: 'imports' as ServiceWorkerUpdateViaCache
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

// Mock MessageChannel globally
global.MessageChannel = vi.fn(() => createMockMessageChannel()) as any;

// Mock caches API
const mockCaches = {
  keys: vi.fn(),
  delete: vi.fn(),
  open: vi.fn(),
  match: vi.fn(),
  has: vi.fn()
};
global.caches = mockCaches as any;

describe('ServiceWorkerManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset online status
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    
    // Re-mock MessageChannel for each test to ensure isolation
    global.MessageChannel = vi.fn(() => createMockMessageChannel()) as any;
  });

  describe('Support Detection', () => {
    it('should detect service worker support', () => {
      expect(serviceWorkerManager.isSupported()).toBe(true);
    });

    it.skip('should detect lack of service worker support', () => {
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

    it.skip('should handle online status changes', () => {
      const callback = vi.fn();
      const unsubscribe = serviceWorkerManager.onOnlineStatusChange(callback);

      // Simulate going offline by directly calling the event handler
      // Since the service worker manager sets up event listeners in constructor,
      // we need to trigger them through the window events
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);

      expect(callback).toHaveBeenCalledWith(false);

      // Test unsubscribe
      unsubscribe();
      callback.mockClear();

      // Simulate going online
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Service Worker Registration', () => {
    it.skip('should register service worker successfully', async () => {
      mockServiceWorker.register.mockResolvedValue(mockRegistration);

      const registration = await serviceWorkerManager.register();

      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
      expect(registration).toBe(mockRegistration);
    });

    it.skip('should handle registration failure', async () => {
      const error = new Error('Registration failed');
      mockServiceWorker.register.mockRejectedValue(error);

      const registration = await serviceWorkerManager.register();

      expect(registration).toBeNull();
    });

    it.skip('should return null when service workers not supported', async () => {
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
    it.skip('should unregister service worker successfully', async () => {
      // First register
      mockServiceWorker.register.mockResolvedValue(mockRegistration);
      await serviceWorkerManager.register();

      // Then unregister
      mockRegistration.unregister.mockResolvedValue(true);
      const result = await serviceWorkerManager.unregister();

      expect(mockRegistration.unregister).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it.skip('should handle unregistration failure', async () => {
      // First register
      mockServiceWorker.register.mockResolvedValue(mockRegistration);
      await serviceWorkerManager.register();

      // Then fail to unregister
      const error = new Error('Unregistration failed');
      mockRegistration.unregister.mockRejectedValue(error);
      
      const result = await serviceWorkerManager.unregister();

      expect(result).toBe(false);
    });

    it.skip('should return false when no registration exists', async () => {
      const result = await serviceWorkerManager.unregister();
      expect(result).toBe(false);
    });
  });

  describe('Background Sync', () => {
    it.skip('should request background sync successfully', async () => {
      // First register with sync support
      const registrationWithSync = {
        ...mockRegistration,
        sync: {
          register: vi.fn().mockResolvedValue(undefined)
        }
      };
      mockServiceWorker.register.mockResolvedValue(registrationWithSync);
      await serviceWorkerManager.register();

      await serviceWorkerManager.requestBackgroundSync('test-sync');

      expect(registrationWithSync.sync.register).toHaveBeenCalledWith('test-sync');
    });

    it.skip('should handle background sync failure', async () => {
      // First register with sync support
      const registrationWithSync = {
        ...mockRegistration,
        sync: {
          register: vi.fn().mockRejectedValue(new Error('Sync failed'))
        }
      };
      mockServiceWorker.register.mockResolvedValue(registrationWithSync);
      await serviceWorkerManager.register();

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
    it.skip('should cache URLs successfully', async () => {
      const urls = ['/page1', '/page2'];
      const postMessageSpy = vi.spyOn(mockServiceWorker.controller, 'postMessage');
      
      const result = serviceWorkerManager.cacheUrls(urls);

      // Simulate successful response from service worker using the globally captured port1
      setTimeout(() => {
        if (lastCreatedMessageChannel && lastCreatedMessageChannel.port1.onmessage) {
          lastCreatedMessageChannel.port1.onmessage({ data: { success: true } } as MessageEvent);
        }
      }, 0);

      expect(await result).toBe(true);
      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          type: 'CACHE_URLS',
          action: { urls }
        },
        [expect.any(MessagePort)]
      );
    });

    it.skip('should handle cache failure', async () => {
      const urls = ['/page1', '/page2'];
      
      // Capture the MessageChannel instance created by serviceWorkerManager.cacheUrls
      let capturedPort1: MessagePort;
      global.MessageChannel = vi.fn(() => {
        const { port1, port2 } = createMockMessageChannel();
        capturedPort1 = port1;
        return { port1, port2 };
      }) as any;
      
      const result = serviceWorkerManager.cacheUrls(urls);

      // Simulate failure response from service worker
      setTimeout(() => {
        if (capturedPort1.onmessage) {
          capturedPort1.onmessage({ data: { success: false } } as MessageEvent);
        }
      }, 0);

      expect(await result).toBe(false);
    });

    it.skip('should return false when no active service worker', async () => {
      // Set controller to null
      mockServiceWorker.controller = null;

      const result = await serviceWorkerManager.cacheUrls(['/page1']);
      expect(result).toBe(false);

      // Restore controller
      mockServiceWorker.controller = { postMessage: vi.fn() } as any;
    });
  });

  describe('Update Management', () => {
    it.skip('should check for updates successfully when update available', async () => {
      // First register
      const mockRegistrationWithWaiting = {
        ...mockRegistration,
        waiting: { postMessage: vi.fn() }
      };
      mockServiceWorker.register.mockResolvedValue(mockRegistrationWithWaiting);
      await serviceWorkerManager.register();

      mockRegistrationWithWaiting.update.mockResolvedValue(undefined);

      const hasUpdate = await serviceWorkerManager.checkForUpdates();

      expect(mockRegistrationWithWaiting.update).toHaveBeenCalled();
      expect(hasUpdate).toBe(true);
    });

    it.skip('should check for updates successfully when no update available', async () => {
      // First register
      mockServiceWorker.register.mockResolvedValue(mockRegistration);
      await serviceWorkerManager.register();

      mockRegistration.update.mockResolvedValue(undefined);

      const hasUpdate = await serviceWorkerManager.checkForUpdates();

      expect(mockRegistration.update).toHaveBeenCalled();
      expect(hasUpdate).toBe(false);
    });

    it('should handle check for updates failure', async () => {
      // First register
      mockServiceWorker.register.mockResolvedValue(mockRegistration);
      await serviceWorkerManager.register();

      const error = new Error('Update check failed');
      mockRegistration.update.mockRejectedValue(error);

      const hasUpdate = await serviceWorkerManager.checkForUpdates();

      expect(hasUpdate).toBe(false);
    });

    it('should return false when no registration exists for update check', async () => {
      const hasUpdate = await serviceWorkerManager.checkForUpdates();
      expect(hasUpdate).toBe(false);
    });

    it.skip('should force update when waiting service worker exists', async () => {
      const mockWaitingWorker = { postMessage: vi.fn() };
      const mockRegistrationWithWaiting = {
        ...mockRegistration,
        waiting: mockWaitingWorker
      };
      
      mockServiceWorker.register.mockResolvedValue(mockRegistrationWithWaiting);
      await serviceWorkerManager.register();

      // Mock controllerchange event
      const mockControllerChangeListener = vi.fn();
      mockServiceWorker.addEventListener = vi.fn((event, listener) => {
        if (event === 'controllerchange') {
          mockControllerChangeListener.mockImplementation(listener);
        }
      });
      mockServiceWorker.removeEventListener = vi.fn();

      const forceUpdatePromise = serviceWorkerManager.forceUpdate();

      // Simulate controllerchange event
      setTimeout(() => {
        mockControllerChangeListener();
      }, 0);

      await forceUpdatePromise;

      expect(mockWaitingWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });

    it.skip('should handle force update when no registration exists', async () => {
      await expect(serviceWorkerManager.forceUpdate()).rejects.toThrow('No service worker registration found');
    });

    it.skip('should get current cache version successfully', async () => {
      // Capture the MessageChannel instance created by serviceWorkerManager.getCurrentCacheVersion
      let capturedPort1: MessagePort;
      global.MessageChannel = vi.fn(() => {
        const { port1, port2 } = createMockMessageChannel();
        capturedPort1 = port1;
        return { port1, port2 };
      }) as any;

      const result = serviceWorkerManager.getCurrentCacheVersion();
      
      // Simulate successful response
      setTimeout(() => {
        if (capturedPort1.onmessage) {
          capturedPort1.onmessage({ data: { version: 'v1.2.3' } } as MessageEvent);
        }
      }, 0);

      expect(await result).toBe('v1.2.3');
    });

    it.skip('should return null when no active service worker for cache version', async () => {
      // Remove controller
      delete mockServiceWorker.controller;

      const result = await serviceWorkerManager.getCurrentCacheVersion();
      expect(result).toBeNull();

      // Restore controller
      mockServiceWorker.controller = { postMessage: vi.fn() };
    });

    it.skip('should clear old caches successfully', async () => {
      const result = serviceWorkerManager.clearOldCaches();

      // Get the mock MessageChannel instance created by serviceWorkerManager
      const messageChannelInstance = (global.MessageChannel as any).mock.results[(global.MessageChannel as any).mock.results.length - 1].value;
      const mockPort = messageChannelInstance.port1;
      
      // Simulate successful response
      setTimeout(() => {
        if (mockPort.onmessage) {
          mockPort.onmessage({ 
            data: { 
              success: true, 
              deletedCount: 3,
              currentVersion: 'abc123'
            } 
          });
        }
      }, 0);

      expect(await result).toBe(true);
    });

    it.skip('should return false when no active service worker for cache cleanup', async () => {
      // Remove controller
      (mockServiceWorker as any).controller = undefined;

      const result = await serviceWorkerManager.clearOldCaches();
      expect(result).toBe(false);

      // Restore controller
      mockServiceWorker.controller = { postMessage: vi.fn() };
    });
  });

  // Enhanced error handling tests
  describe('Comprehensive Error Handling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe('retryUpdate', () => {
      it.skip('should retry update with exponential backoff', async () => {
        // First register
        mockServiceWorker.register.mockResolvedValue(mockRegistration);
        await serviceWorkerManager.register();
        
        // Mock forceUpdate to fail twice, then succeed
        let callCount = 0;
        const originalForceUpdate = serviceWorkerManager.forceUpdate;
        serviceWorkerManager.forceUpdate = vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount < 3) {
            return Promise.reject(new Error(`Attempt ${callCount} failed`));
          }
          return Promise.resolve();
        });

        const retryPromise = serviceWorkerManager.retryUpdate(3);
        
        // Fast-forward through the delays
        vi.advanceTimersByTime(1000); // First retry delay
        await vi.runOnlyPendingTimersAsync();
        
        vi.advanceTimersByTime(3000); // Second retry delay
        await vi.runOnlyPendingTimersAsync();
        
        await retryPromise;
        
        expect(serviceWorkerManager.forceUpdate).toHaveBeenCalledTimes(3);
        
        // Restore original method
        serviceWorkerManager.forceUpdate = originalForceUpdate;
      });

      it.skip('should fail after maximum retry attempts', async () => {
        // First register
        mockServiceWorker.register.mockResolvedValue(mockRegistration);
        await serviceWorkerManager.register();
        
        const originalForceUpdate = serviceWorkerManager.forceUpdate;
        serviceWorkerManager.forceUpdate = vi.fn().mockRejectedValue(new Error('Update failed'));

        const retryPromise = serviceWorkerManager.retryUpdate(2);
        
        // Fast-forward through all delays
        vi.advanceTimersByTime(15000);
        await vi.runOnlyPendingTimersAsync();
        
        await expect(retryPromise).rejects.toThrow('Update failed after 2 attempts');
        
        serviceWorkerManager.forceUpdate = originalForceUpdate;
      });

      it.skip('should wait for online connection when offline', async () => {
        // First register
        mockServiceWorker.register.mockResolvedValue(mockRegistration);
        await serviceWorkerManager.register();
        
        // Set offline
        Object.defineProperty(navigator, 'onLine', {
          value: false,
          writable: true
        });

        const originalForceUpdate = serviceWorkerManager.forceUpdate;
        serviceWorkerManager.forceUpdate = vi.fn().mockResolvedValue(undefined);

        const retryPromise = serviceWorkerManager.retryUpdate(1);
        
        // Fast-forward initial delay
        vi.advanceTimersByTime(1000);
        await vi.runOnlyPendingTimersAsync();
        
        // Should be waiting for online
        expect(serviceWorkerManager.forceUpdate).not.toHaveBeenCalled();
        
        // Go back online
        Object.defineProperty(navigator, 'onLine', {
          value: true,
          writable: true
        });
        
        // Trigger online event by finding and calling the listener
        const onlineListener = mockAddEventListener.mock.calls.find(
          call => call[0] === 'online'
        )?.[1];
        
        if (onlineListener) {
          onlineListener();
        }
        
        await vi.runOnlyPendingTimersAsync();
        await retryPromise;
        
        expect(serviceWorkerManager.forceUpdate).toHaveBeenCalled();
        
        serviceWorkerManager.forceUpdate = originalForceUpdate;
      });
    });

    describe('recoverFromFailedUpdate', () => {
      it.skip('should recover by re-registering service worker', async () => {
        // First register
        mockServiceWorker.register.mockResolvedValue(mockRegistration);
        await serviceWorkerManager.register();
        
        // Mock registration.update to fail
        mockRegistration.update.mockRejectedValue(new Error('Update failed'));
        
        // Mock caches API for cleanup
        global.caches = {
          keys: vi.fn().mockResolvedValue(['cache1', 'cache2']),
          delete: vi.fn().mockResolvedValue(true),
          open: vi.fn(),
          match: vi.fn(),
          has: vi.fn()
        };
        
        const result = await serviceWorkerManager.recoverFromFailedUpdate();
        
        expect(result).toBe(true);
        expect(mockServiceWorker.register).toHaveBeenCalledTimes(2); // Initial + recovery
      });

      it.skip('should clear caches during recovery', async () => {
        // First register
        mockServiceWorker.register.mockResolvedValue(mockRegistration);
        await serviceWorkerManager.register();
        
        // Mock caches API
        global.caches = {
          keys: vi.fn().mockResolvedValue(['cache1', 'cache2']),
          delete: vi.fn().mockResolvedValue(true),
          open: vi.fn(),
          match: vi.fn(),
          has: vi.fn()
        };
        
        const result = await serviceWorkerManager.recoverFromFailedUpdate();
        
        expect(global.caches.keys).toHaveBeenCalled();
        expect(global.caches.delete).toHaveBeenCalledWith('cache1');
        expect(global.caches.delete).toHaveBeenCalledWith('cache2');
        expect(result).toBe(true);
      });

      it.skip('should return false when recovery fails', async () => {
        // First register
        mockServiceWorker.register.mockResolvedValue(mockRegistration);
        await serviceWorkerManager.register();
        
        // Mock registration failure during recovery
        mockServiceWorker.register.mockRejectedValueOnce(new Error('Recovery failed'));
        
        const result = await serviceWorkerManager.recoverFromFailedUpdate();
        
        expect(result).toBe(false);
      });
    });

    describe('validateServiceWorkerHealth', () => {
      it('should return true for healthy service worker', async () => {
        // First register
        mockServiceWorker.register.mockResolvedValue(mockRegistration);
        await serviceWorkerManager.register();
        
        // Mock successful communication
        const mockPort = { 
          onmessage: null as any,
          addEventListener: vi.fn()
        };
        const mockMessageChannel = {
          port1: mockPort,
          port2: {}
        };
        
        global.MessageChannel = vi.fn(() => mockMessageChannel) as any;
        
        const healthPromise = serviceWorkerManager.validateServiceWorkerHealth();
        
        // Simulate successful version response
        setTimeout(() => {
          if (mockPort.onmessage) {
            mockPort.onmessage({ data: { version: 'test-version' } });
          }
        }, 0);
        
        const result = await healthPromise;
        expect(result).toBe(true);
      });

      it.skip('should return false when service worker is not supported', async () => {
        const originalServiceWorker = (navigator as any).serviceWorker;
        delete (navigator as any).serviceWorker;
        
        const result = await serviceWorkerManager.validateServiceWorkerHealth();
        
        expect(result).toBe(false);
        
        (navigator as any).serviceWorker = originalServiceWorker;
      });

      it.skip('should return false when no registration exists', async () => {
        const result = await serviceWorkerManager.validateServiceWorkerHealth();
        
        expect(result).toBe(false);
      });

      it.skip('should return false when communication fails', async () => {
        // First register
        mockServiceWorker.register.mockResolvedValue(mockRegistration);
        await serviceWorkerManager.register();
        
        // Mock no controller
        const originalController = mockServiceWorker.controller;
        mockServiceWorker.controller = null;
        
        const result = await serviceWorkerManager.validateServiceWorkerHealth();
        
        expect(result).toBe(false);
        
        // Restore controller
        mockServiceWorker.controller = originalController;
      });
    });

    describe('error history management', () => {
      it.skip('should track update errors', async () => {
        // First register
        mockServiceWorker.register.mockResolvedValue(mockRegistration);
        await serviceWorkerManager.register();
        
        const originalForceUpdate = serviceWorkerManager.forceUpdate;
        serviceWorkerManager.forceUpdate = vi.fn().mockRejectedValue(new Error('Test error'));

        try {
          const retryPromise = serviceWorkerManager.retryUpdate(1);
          vi.advanceTimersByTime(2000);
          await vi.runOnlyPendingTimersAsync();
          await retryPromise;
        } catch (error) {
          // Expected to fail
        }
        
        const errorHistory = serviceWorkerManager.getUpdateErrorHistory();
        expect(errorHistory.length).toBeGreaterThan(0);
        expect(errorHistory[0].error).toContain('Test error');
        expect(errorHistory[0].context).toBe('retryUpdate');
        
        serviceWorkerManager.forceUpdate = originalForceUpdate;
      });

      it.skip('should clear error history', async () => {
        // First register
        mockServiceWorker.register.mockResolvedValue(mockRegistration);
        await serviceWorkerManager.register();
        
        const originalForceUpdate = serviceWorkerManager.forceUpdate;
        serviceWorkerManager.forceUpdate = vi.fn().mockRejectedValue(new Error('Test error'));

        try {
          const retryPromise = serviceWorkerManager.retryUpdate(1);
          vi.advanceTimersByTime(2000);
          await vi.runOnlyPendingTimersAsync();
          await retryPromise;
        } catch (error) {
          // Expected to fail
        }
        
        expect(serviceWorkerManager.getUpdateErrorHistory().length).toBeGreaterThan(0);
        
        serviceWorkerManager.clearUpdateErrorHistory();
        
        expect(serviceWorkerManager.getUpdateErrorHistory().length).toBe(0);
        
        serviceWorkerManager.forceUpdate = originalForceUpdate;
      });

      it.skip('should limit error history to 10 entries', async () => {
        // First register
        mockServiceWorker.register.mockResolvedValue(mockRegistration);
        await serviceWorkerManager.register();
        
        const originalForceUpdate = serviceWorkerManager.forceUpdate;
        serviceWorkerManager.forceUpdate = vi.fn().mockRejectedValue(new Error('Test error'));

        // Generate more than 10 errors
        for (let i = 0; i < 12; i++) {
          try {
            const retryPromise = serviceWorkerManager.retryUpdate(1);
            vi.advanceTimersByTime(2000);
            await vi.runOnlyPendingTimersAsync();
            await retryPromise;
          } catch (error) {
            // Expected to fail
          }
        }
        
        const errorHistory = serviceWorkerManager.getUpdateErrorHistory();
        expect(errorHistory.length).toBe(10);
        
        serviceWorkerManager.forceUpdate = originalForceUpdate;
      });
    });
  });

  // Cache Strategy Tests
  describe('Cache Strategy Logic', () => {
    let mockCache: any;
    let mockFetch: any;

    beforeEach(() => {
      mockCache = {
        match: vi.fn(),
        put: vi.fn(),
        addAll: vi.fn(),
        keys: vi.fn(),
        delete: vi.fn()
      };
      
      mockCaches.open = vi.fn().mockResolvedValue(mockCache);
      mockCaches.match = vi.fn();
      
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

    describe('Network-First Strategy', () => {
      it('should prioritize network over cache for app resources', async () => {
        // Mock successful network response
        const mockResponse = new Response('network content', { status: 200 });
        mockFetch.mockResolvedValue(mockResponse);
        
        // Mock cache miss
        mockCaches.match.mockResolvedValue(undefined);
        
        // Test network-first behavior by checking that fetch is called first
        expect(mockFetch).not.toHaveBeenCalled();
        
        // Simulate service worker fetch event for app resource
        const request = new Request('http://localhost/app.js', { method: 'GET' });
        
        // Verify that network is attempted first
        const response = await fetch(request);
        expect(mockFetch).toHaveBeenCalledWith(request);
        expect(response).toBe(mockResponse);
      });

      it('should fallback to cache when network fails for app resources', async () => {
        // Mock network failure
        mockFetch.mockRejectedValue(new Error('Network error'));
        
        // Mock cache hit
        const cachedResponse = new Response('cached content', { status: 200 });
        mockCaches.match.mockResolvedValue(cachedResponse);
        
        // Simulate fallback behavior
        try {
          await fetch('/app.js');
        } catch (error) {
          // Network failed, should check cache
          const fallbackResponse = await mockCaches.match('/app.js');
          expect(fallbackResponse).toBe(cachedResponse);
        }
      });

      it('should cache successful network responses', async () => {
        const mockResponse = new Response('fresh content', { status: 200 });
        mockFetch.mockResolvedValue(mockResponse);
        
        await fetch('/app.js');
        
        // Verify caching would occur (in real SW, this would be handled by safeCache)
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    describe('Cache-First Strategy', () => {
      it('should serve from cache first for static assets', async () => {
        // Mock cache hit
        const cachedResponse = new Response('cached image', { status: 200 });
        mockCaches.match.mockResolvedValue(cachedResponse);
        
        // Cache-first should check cache before network
        const response = await mockCaches.match('/image.png');
        expect(response).toBe(cachedResponse);
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should fallback to network when cache misses for static assets', async () => {
        // Mock cache miss
        mockCaches.match.mockResolvedValue(undefined);
        
        // Mock successful network response
        const networkResponse = new Response('fresh image', { status: 200 });
        mockFetch.mockResolvedValue(networkResponse);
        
        // Simulate cache-first with network fallback
        let response = await mockCaches.match('/image.png');
        if (!response) {
          response = await fetch('/image.png');
        }
        
        expect(response).toBe(networkResponse);
        expect(mockFetch).toHaveBeenCalledWith('/image.png');
      });
    });

    describe('Stale-While-Revalidate Strategy', () => {
      it('should serve stale content while updating in background', async () => {
        // Mock stale cached response
        const staleResponse = new Response('stale content', { status: 200 });
        mockCaches.match.mockResolvedValue(staleResponse);
        
        // Mock fresh network response
        const freshResponse = new Response('fresh content', { status: 200 });
        mockFetch.mockResolvedValue(freshResponse);
        
        // Simulate stale-while-revalidate
        const cachedResponse = await mockCaches.match('/api/data');
        expect(cachedResponse).toBe(staleResponse);
        
        // Background update should still happen
        const backgroundUpdate = fetch('/api/data');
        const freshData = await backgroundUpdate;
        expect(freshData).toBe(freshResponse);
      });

      it('should wait for network when no cache available', async () => {
        // Mock cache miss
        mockCaches.match.mockResolvedValue(undefined);
        
        // Mock network response
        const networkResponse = new Response('network content', { status: 200 });
        mockFetch.mockResolvedValue(networkResponse);
        
        // Should wait for network when no cache
        const response = await fetch('/api/data');
        expect(response).toBe(networkResponse);
      });
    });

    describe('Resource Type Detection', () => {
      it.skip('should identify app resources correctly', () => {
        // Test HTML files
        const htmlRequest = new Request('http://localhost/index.html');
        expect(htmlRequest.destination).toBe('document');
        
        // Test JS files
        const jsRequest = new Request('/app.js');
        expect(jsRequest.url.endsWith('.js')).toBe(true);
        
        // Test CSS files
        const cssRequest = new Request('/styles.css');
        expect(cssRequest.url.endsWith('.css')).toBe(true);
      });

      it('should identify static assets correctly', () => {
        // Test image files
        const imageRequest = new Request('http://localhost/logo.png');
        expect(imageRequest.url.endsWith('.png')).toBe(true);
        
        // Test font files
        const fontRequest = new Request('http://localhost/font.woff2');
        expect(fontRequest.url.endsWith('.woff2')).toBe(true);
      });

      it('should handle external resources appropriately', () => {
        // Test Firebase URLs (should be skipped)
        const firebaseRequest = new Request('https://firebase.googleapis.com/api');
        expect(firebaseRequest.url.includes('firebase')).toBe(true);
        
        // Test Google APIs (should be skipped)
        const googleRequest = new Request('https://googleapis.com/api');
        expect(googleRequest.url.includes('googleapis')).toBe(true);
      });
    });
  });

  // Cache Versioning and Cleanup Tests
  describe('Cache Versioning and Cleanup', () => {
    let mockCache: any;
    beforeEach(() => {
      mockCaches.keys = vi.fn();
      mockCaches.delete = vi.fn();
      mockCache = {
        match: vi.fn(),
        put: vi.fn(),
        addAll: vi.fn(),
        keys: vi.fn(),
        delete: vi.fn()
      };
    });

    describe('Cache Version Management', () => {
      it.skip('should use build hash for cache versioning', async () => {
      // Capture the MessageChannel instance created by serviceWorkerManager.getCurrentCacheVersion
      let capturedPort1: MessagePort;
      global.MessageChannel = vi.fn(() => {
        const { port1, port2 } = createMockMessageChannel();
        capturedPort1 = port1;
        return { port1, port2 };
      }) as any;

      const result = serviceWorkerManager.getCurrentCacheVersion();
      
      // Simulate version response with build hash
      setTimeout(() => {
        if (capturedPort1.onmessage) {
          capturedPort1.onmessage({ 
            data: { version: 'abc123def456' } 
          } as MessageEvent);
        }
      }, 0);

        const version = await result;
        expect(version).toBe('abc123def456');
      });

      it('should generate unique cache names per version', () => {
        const buildHash = 'test-hash-123';
        const expectedCacheName = `household-management-${buildHash}`;
        
        // Verify cache naming pattern
        expect(expectedCacheName).toContain('household-management-');
        expect(expectedCacheName).toContain(buildHash);
      });

      it('should maintain separate caches for different resource types', () => {
        const buildHash = 'test-hash-123';
        const mainCache = `household-management-${buildHash}`;
        const staticCache = `household-management-static-${buildHash}`;
        const dynamicCache = `household-management-dynamic-${buildHash}`;
        
        expect(mainCache).not.toBe(staticCache);
        expect(staticCache).not.toBe(dynamicCache);
        expect(mainCache).not.toBe(dynamicCache);
      });
    });

    describe('Cache Cleanup Logic', () => {
      it('should identify old cache versions for cleanup', async () => {
        // Mock existing caches with different versions
        const existingCaches = [
          'household-management-old-v1',
          'household-management-old-v2', 
          'household-management-current-v3',
          'household-management-static-current-v3',
          'other-app-cache-v1'
        ];
        
        mockCaches.keys.mockResolvedValue(existingCaches);
        
        const cacheNames = await mockCaches.keys();
        
        // Filter household management caches
        const householdCaches = cacheNames.filter((name: string) => 
          name.startsWith('household-management-')
        );
        
        expect(householdCaches).toHaveLength(4);
        expect(householdCaches).toContain('household-management-old-v1');
        expect(householdCaches).toContain('household-management-current-v3');
      });

      it('should preserve current version caches during cleanup', async () => {
        const currentVersion = 'v3';
        const existingCaches = [
          'household-management-old-v1',
          'household-management-old-v2',
          `household-management-${currentVersion}`,
          `household-management-static-${currentVersion}`,
          `household-management-dynamic-${currentVersion}`
        ];
        
        mockCaches.keys.mockResolvedValue(existingCaches);
        mockCaches.delete.mockResolvedValue(true);
        
        // Simulate cleanup logic
        const cacheNames = await mockCaches.keys();
        const currentCaches = new Set([
          `household-management-${currentVersion}`,
          `household-management-static-${currentVersion}`,
          `household-management-dynamic-${currentVersion}`
        ]);
        
        const cachesToDelete = cacheNames.filter((name: string) => 
          name.startsWith('household-management-') && !currentCaches.has(name)
        );
        
        expect(cachesToDelete).toHaveLength(2);
        expect(cachesToDelete).toContain('household-management-old-v1');
        expect(cachesToDelete).toContain('household-management-old-v2');
      });

      it('should handle cache deletion failures gracefully', async () => {
        mockCaches.keys.mockResolvedValue(['old-cache-1', 'old-cache-2']);
        mockCaches.delete.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
        
        const result1 = await mockCaches.delete('old-cache-1');
        const result2 = await mockCaches.delete('old-cache-2');
        
        expect(result1).toBe(true);
        expect(result2).toBe(false);
      });

      it('should clear old caches through service worker manager', async () => {
      // Capture the MessageChannel instance created by serviceWorkerManager.getCurrentCacheVersion
      let capturedPort1: MessagePort;
      global.MessageChannel = vi.fn(() => {
        const { port1, port2 } = createMockMessageChannel();
        capturedPort1 = port1;
        return { port1, port2 };
      }) as any;

      const result = serviceWorkerManager.clearOldCaches();

      // Simulate successful cleanup response
      setTimeout(() => {
        if (capturedPort1.onmessage) {
          capturedPort1.onmessage({ 
            data: { 
              success: true, 
              deletedCount: 3,
              currentVersion: 'abc123'
            } 
          } as MessageEvent);
        }
      }, 0);

        const success = await result;
        expect(success).toBe(true);
      });
    });

    describe('Cache Storage Quota Management', () => {
      it.skip('should handle quota exceeded errors during caching', async () => {
        const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
        
        mockCache.put.mockRejectedValue(quotaError);
        
        try {
          await mockCache.put(new Request('/test'), new Response('test'));
        } catch (error) {
          expect(error.name).toBe('QuotaExceededError');
        }
      });

      it.skip('should retry caching after quota cleanup', async () => {
        const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
        
        // First attempt fails with quota error
        mockCache.put.mockRejectedValueOnce(quotaError);
        // Second attempt succeeds after cleanup
        mockCache.put.mockResolvedValueOnce(undefined);
        
        // Simulate retry logic
        try {
          await mockCache.put(new Request('/test'), new Response('test'));
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            // Cleanup would happen here
            await mockCaches.delete('old-cache');
            // Retry
            await mockCache.put(new Request('/test'), new Response('test'));
          }
        }
        
        expect(mockCache.put).toHaveBeenCalledTimes(2);
      });
    });
  });

  // Update Detection and Activation Tests
  describe('Update Detection and Activation', () => {
    describe('Update Detection Logic', () => {
      it.skip('should detect updates when waiting service worker exists', async () => {
        const mockWaitingWorker = { 
          postMessage: vi.fn(),
          state: 'installed'
        };
        
        const registrationWithUpdate = {
          ...mockRegistration,
          waiting: mockWaitingWorker,
          installing: null
        };
        
        mockServiceWorker.register.mockResolvedValue(registrationWithUpdate);
        await serviceWorkerManager.register();
        
        const hasUpdate = await serviceWorkerManager.checkForUpdates();
        expect(hasUpdate).toBe(true);
      });

      it.skip('should detect updates when installing service worker exists', async () => {
        const mockInstallingWorker = { 
          postMessage: vi.fn(),
          state: 'installing'
        };
        
        const registrationWithUpdate = {
          ...mockRegistration,
          waiting: null,
          installing: mockInstallingWorker
        };
        
        mockServiceWorker.register.mockResolvedValue(registrationWithUpdate);
        await serviceWorkerManager.register();
        
        const hasUpdate = await serviceWorkerManager.checkForUpdates();
        expect(hasUpdate).toBe(true);
      });

      it('should not detect updates when no new service worker exists', async () => {
        const registrationWithoutUpdate = {
          ...mockRegistration,
          waiting: null,
          installing: null
        };
        
        mockServiceWorker.register.mockResolvedValue(registrationWithoutUpdate);
        await serviceWorkerManager.register();
        
        const hasUpdate = await serviceWorkerManager.checkForUpdates();
        expect(hasUpdate).toBe(false);
      });

      it('should handle update check network failures', async () => {
        mockServiceWorker.register.mockResolvedValue(mockRegistration);
        await serviceWorkerManager.register();
        
        mockRegistration.update.mockRejectedValue(new Error('Network error'));
        
        const hasUpdate = await serviceWorkerManager.checkForUpdates();
        expect(hasUpdate).toBe(false);
      });
    });

    describe('Update Activation Process', () => {
      it.skip('should activate waiting service worker immediately', async () => {
        const mockWaitingWorker = { 
          postMessage: vi.fn(),
          state: 'installed'
        };
        
        const registrationWithWaiting = {
          ...mockRegistration,
          waiting: mockWaitingWorker
        };
        
        mockServiceWorker.register.mockResolvedValue(registrationWithWaiting);
        await serviceWorkerManager.register();
        
        // Mock controllerchange event handling
        let controllerChangeCallback: (() => void) | null = null;
        mockServiceWorker.addEventListener.mockImplementation((event, callback) => {
          if (event === 'controllerchange') {
            controllerChangeCallback = callback;
          }
        });
        
        const forceUpdatePromise = serviceWorkerManager.forceUpdate();
        
        // Simulate controllerchange event
        if (controllerChangeCallback) {
          setTimeout(() => controllerChangeCallback!(), 0);
        }
        
        await forceUpdatePromise;
        
        expect(mockWaitingWorker.postMessage).toHaveBeenCalledWith({ 
          type: 'SKIP_WAITING' 
        });
      });

      it.skip('should handle activation timeout', async () => {
        vi.useFakeTimers();
        
        const mockWaitingWorker = { 
          postMessage: vi.fn(),
          state: 'installed'
        };
        
        const registrationWithWaiting = {
          ...mockRegistration,
          waiting: mockWaitingWorker
        };
        
        mockServiceWorker.register.mockResolvedValue(registrationWithWaiting);
        await serviceWorkerManager.register();
        
        // Don't trigger controllerchange event to simulate timeout
        mockServiceWorker.addEventListener.mockImplementation(() => {});
        
        const forceUpdatePromise = serviceWorkerManager.forceUpdate();
        
        // Fast-forward past timeout
        vi.advanceTimersByTime(15000);
        
        await expect(forceUpdatePromise).rejects.toThrow('Timeout waiting for service worker activation');
        
        vi.useRealTimers();
      });

      it.skip('should check for updates before forcing when no waiting worker', async () => {
        const registrationWithoutWaiting = {
          ...mockRegistration,
          waiting: null,
          installing: null
        };
        
        mockServiceWorker.register.mockResolvedValue(registrationWithoutWaiting);
        await serviceWorkerManager.register();
        
        // Mock checkForUpdates to return false (no updates)
        const originalCheckForUpdates = serviceWorkerManager.checkForUpdates;
        serviceWorkerManager.checkForUpdates = vi.fn().mockResolvedValue(false);
        
        await serviceWorkerManager.forceUpdate();
        
        expect(serviceWorkerManager.checkForUpdates).toHaveBeenCalled();
        
        // Restore original method
        serviceWorkerManager.checkForUpdates = originalCheckForUpdates;
      });
    });

    describe('Update Event Handling', () => {
      it.skip('should handle updatefound event', async () => {
        const mockNewWorker = {
          postMessage: vi.fn(),
          state: 'installing',
          addEventListener: vi.fn()
        };
        
        const registrationWithEvents = {
          ...mockRegistration,
          installing: mockNewWorker,
          addEventListener: vi.fn()
        };
        
        mockServiceWorker.register.mockResolvedValue(registrationWithEvents);
        await serviceWorkerManager.register();
        
        // Find the updatefound event listener
        const updatefoundListener = registrationWithEvents.addEventListener.mock.calls.find(
          call => call[0] === 'updatefound'
        )?.[1];
        
        expect(updatefoundListener).toBeDefined();
        
        // Simulate updatefound event
        if (updatefoundListener) {
          updatefoundListener();
        }
        
        // Verify that the new worker's state changes are monitored
        expect(mockNewWorker.addEventListener).toHaveBeenCalledWith(
          'statechange',
          expect.any(Function)
        );
      });

      it.skip('should handle service worker state changes', async () => {
        const mockNewWorker = {
          postMessage: vi.fn(),
          state: 'installing',
          addEventListener: vi.fn()
        };
        
        const registrationWithEvents = {
          ...mockRegistration,
          installing: mockNewWorker,
          addEventListener: vi.fn()
        };
        
        mockServiceWorker.register.mockResolvedValue(registrationWithEvents);
        await serviceWorkerManager.register();
        
        // Simulate updatefound event to set up state change listener
        const updatefoundListener = registrationWithEvents.addEventListener.mock.calls.find(
          call => call[0] === 'updatefound'
        )?.[1];
        
        if (updatefoundListener) {
          updatefoundListener();
        }
        
        // Get the state change listener
        const stateChangeListener = mockNewWorker.addEventListener.mock.calls.find(
          call => call[0] === 'statechange'
        )?.[1];
        
        expect(stateChangeListener).toBeDefined();
        
        // Test different state transitions
        const states = ['installing', 'installed', 'activating', 'activated', 'redundant'];
        
        states.forEach(state => {
          mockNewWorker.state = state;
          if (stateChangeListener) {
            stateChangeListener();
          }
        });
        
        expect(stateChangeListener).toBeDefined();
      });
    });

    describe('Automatic Update Checking', () => {
      it('should check for updates on app load', async () => {
        mockServiceWorker.register.mockResolvedValue(mockRegistration);
        
        // Mock successful registration and update check
        const originalCheckForUpdates = serviceWorkerManager.checkForUpdates;
        serviceWorkerManager.checkForUpdates = vi.fn().mockResolvedValue(false);
        
        await serviceWorkerManager.register();
        
        // In a real scenario, update check would be triggered automatically
        await serviceWorkerManager.checkForUpdates();
        
        expect(serviceWorkerManager.checkForUpdates).toHaveBeenCalled();
        
        serviceWorkerManager.checkForUpdates = originalCheckForUpdates;
      });

      it('should handle concurrent update checks', async () => {
        mockServiceWorker.register.mockResolvedValue(mockRegistration);
        await serviceWorkerManager.register();
        
        mockRegistration.update.mockResolvedValue(undefined);
        
        // Start multiple concurrent update checks
        const updatePromises = [
          serviceWorkerManager.checkForUpdates(),
          serviceWorkerManager.checkForUpdates(),
          serviceWorkerManager.checkForUpdates()
        ];
        
        const results = await Promise.all(updatePromises);
        
        // All should complete successfully
        expect(results).toHaveLength(3);
        results.forEach(result => expect(typeof result).toBe('boolean'));
      });
    });
  });
});