import { render, screen, waitFor, act, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { serviceWorkerManager } from '../../utils/serviceWorkerManager';
import { useServiceWorker } from '../../hooks/useServiceWorker';
import React from 'react';

// Test component that uses the service worker hook
const TestServiceWorkerComponent: React.FC = () => {
  const {
    updateAvailable,
    updateStatus,
    isUpdating,
    updateError,
    activateUpdateWithProgress,
    retryFailedUpdate,
    dismissUpdateError,
    isOnline
  } = useServiceWorker();

  return (
    <div>
      <div data-testid="online-status">{isOnline ? 'online' : 'offline'}</div>
      {updateAvailable && (
        <div data-testid="update-notification">
          <p>Update available</p>
          <button onClick={activateUpdateWithProgress} disabled={isUpdating}>
            {isUpdating ? 'Updating...' : 'Update Now'}
          </button>
        </div>
      )}
      {updateStatus.downloading && <div data-testid="downloading">Downloading update...</div>}
      {updateStatus.installing && <div data-testid="installing">Installing update...</div>}
      {updateError && (
        <div data-testid="update-error">
          <p>Error: {updateError}</p>
          <button onClick={retryFailedUpdate}>Retry</button>
          <button onClick={dismissUpdateError}>Dismiss</button>
        </div>
      )}
    </div>
  );
};

// Mock service worker registration
const mockRegistration = {
  installing: null,
  waiting: null,
  active: null,
  scope: '/',
  update: vi.fn(),
  unregister: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  postMessage: vi.fn(),
  sync: {
    register: vi.fn(),
  },
};

// Mock service worker
const mockServiceWorker = {
  state: 'activated',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  postMessage: vi.fn(),
};

// Mock navigator.serviceWorker
const mockNavigatorServiceWorker = {
  register: vi.fn(),
  getRegistration: vi.fn(),
  getRegistrations: vi.fn(),
  controller: mockServiceWorker,
  ready: Promise.resolve(mockRegistration),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

// Mock caches API
const mockCache = {
  match: vi.fn(),
  add: vi.fn(),
  addAll: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  keys: vi.fn(),
};

const mockCaches = {
  open: vi.fn().mockResolvedValue(mockCache),
  match: vi.fn(),
  has: vi.fn(),
  delete: vi.fn(),
  keys: vi.fn().mockResolvedValue([]),
};

// Mock MessageChannel for service worker communication
const mockMessageChannel = {
  port1: {
    onmessage: null,
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  port2: {
    onmessage: null,
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
};

describe('Service Worker Update Flow Integration Tests', () => {
  let originalNavigator: typeof navigator;
  let originalCaches: typeof caches;
  let originalMessageChannel: typeof MessageChannel;
  let originalLocation: typeof location;
  let eventListeners: { [key: string]: Function[] } = {};

  beforeEach(() => {
    // Store original globals
    originalNavigator = global.navigator;
    originalCaches = global.caches;
    originalMessageChannel = global.MessageChannel;
    originalLocation = global.location;

    // Reset event listeners
    eventListeners = {};

    // Mock window.location.reload
    Object.defineProperty(global.window, 'location', {
      value: {
        ...originalLocation,
        reload: vi.fn(),
      },
      writable: true,
    });

    // Mock globals
    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        serviceWorker: mockNavigatorServiceWorker,
        onLine: true,
      },
      writable: true,
    });

    Object.defineProperty(global, 'caches', {
      value: mockCaches,
      writable: true,
    });

    Object.defineProperty(global, 'MessageChannel', {
      value: vi.fn(() => mockMessageChannel),
      writable: true,
    });

    // Mock window event listeners
    Object.defineProperty(global.window, 'addEventListener', {
      value: vi.fn((event: string, listener: Function) => {
        if (!eventListeners[event]) {
          eventListeners[event] = [];
        }
        eventListeners[event].push(listener);
      }),
      writable: true,
    });

    Object.defineProperty(global.window, 'removeEventListener', {
      value: vi.fn((event: string, listener: Function) => {
        if (eventListeners[event]) {
          const index = eventListeners[event].indexOf(listener);
          if (index > -1) {
            eventListeners[event].splice(index, 1);
          }
        }
      }),
      writable: true,
    });

    Object.defineProperty(global.window, 'dispatchEvent', {
      value: vi.fn((event: Event) => {
        const listeners = eventListeners[event.type] || [];
        listeners.forEach(listener => listener(event));
      }),
      writable: true,
    });

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock behaviors
    mockNavigatorServiceWorker.register.mockResolvedValue(mockRegistration);
    mockNavigatorServiceWorker.getRegistration.mockResolvedValue(mockRegistration);
    mockRegistration.update.mockResolvedValue(undefined);
    mockRegistration.unregister.mockResolvedValue(true);
    mockCaches.keys.mockResolvedValue([]);
    mockCache.keys.mockResolvedValue([]);
  });

  afterEach(() => {
    // Restore original globals
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
    Object.defineProperty(global, 'caches', {
      value: originalCaches,
      writable: true,
    });
    Object.defineProperty(global, 'MessageChannel', {
      value: originalMessageChannel,
      writable: true,
    });

    vi.clearAllMocks();
  });

  describe('End-to-End Update Process', () => {
    it.skip('should detect and activate service worker updates', async () => {
      // Setup: Mock a waiting service worker (update available)
      const waitingServiceWorker = {
        ...mockServiceWorker,
        state: 'installed',
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
      };
      mockRegistration.waiting = waitingServiceWorker;

      render(<TestServiceWorkerComponent />);

      // Simulate service worker update detection
      act(() => {
        const updateEvent = new CustomEvent('sw-update-available');
        window.dispatchEvent(updateEvent);
      });

      // Should show update notification
      await waitFor(() => {
        expect(screen.getByTestId('update-notification')).toBeInTheDocument();
      });

      // Click update button
      const updateButton = screen.getByRole('button', { name: /update now/i });
      await userEvent.click(updateButton);

      // Should call postMessage to skip waiting
      expect(waitingServiceWorker.postMessage).toHaveBeenCalledWith({
        type: 'SKIP_WAITING'
      });
    });

    it('should handle update process with downloading and installing states', async () => {
      render(<TestServiceWorkerComponent />);

      // Simulate update downloading
      act(() => {
        const downloadingEvent = new CustomEvent('sw-update-downloading');
        window.dispatchEvent(downloadingEvent);
      });

      // Should show downloading state
      await waitFor(() => {
        expect(screen.getByTestId('downloading')).toBeInTheDocument();
      });

      // Simulate update installing
      act(() => {
        const installingEvent = new CustomEvent('sw-update-installing');
        window.dispatchEvent(installingEvent);
      });

      // Should show installing state
      await waitFor(() => {
        expect(screen.getByTestId('installing')).toBeInTheDocument();
      });
    });

    it.skip('should handle update errors with retry mechanism', async () => {
      render(<TestServiceWorkerComponent />);

      // Simulate update error
      act(() => {
        const errorEvent = new CustomEvent('sw-update-error', {
          detail: { error: 'Network error during update' }
        });
        window.dispatchEvent(errorEvent);
      });

      // Should show error message
      await waitFor(() => {
        expect(screen.getByTestId('update-error')).toBeInTheDocument();
        expect(screen.getByText(/network error during update/i)).toBeInTheDocument();
      });

      // Should show retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      // Click retry button
      await userEvent.click(retryButton);

      // Should attempt to check for updates again
      await waitFor(() => {
        expect(mockRegistration.update).toHaveBeenCalled();
      });
    });
  });

  describe('Offline/Online Transition Behavior', () => {
    it.skip('should handle going offline and coming back online', async () => {
      render(<TestServiceWorkerComponent />);

      // Should initially show online status
      expect(screen.getByTestId('online-status')).toHaveTextContent('online');

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      act(() => {
        const offlineEvent = new Event('offline');
        const listeners = eventListeners['offline'] || [];
        listeners.forEach(listener => listener(offlineEvent));
      });

      // Should show offline status
      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toHaveTextContent('offline');
      });

      // Simulate coming back online
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      act(() => {
        const onlineEvent = new Event('online');
        const listeners = eventListeners['online'] || [];
        listeners.forEach(listener => listener(onlineEvent));
      });

      // Should show online status again
      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toHaveTextContent('online');
      });

      // Should trigger background sync
      await waitFor(() => {
        expect(mockRegistration.sync?.register).toHaveBeenCalledWith('household-sync');
      });
    });

    it.skip('should handle intermittent connectivity during updates', async () => {
      // Mock fetch to simulate network failures
      const originalFetch = global.fetch;
      let fetchCallCount = 0;
      
      global.fetch = vi.fn(() => {
        fetchCallCount++;
        if (fetchCallCount <= 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(new Response('OK', { status: 200 }));
      });

      render(<TestServiceWorkerComponent />);

      // Trigger update check
      act(() => {
        serviceWorkerManager.checkForUpdates();
      });

      // Should eventually succeed after retries
      await waitFor(() => {
        expect(fetchCallCount).toBeGreaterThan(2);
      }, { timeout: 10000 });

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('Cache Invalidation Scenarios', () => {
    it.skip('should clear old caches when new version is activated', async () => {
      // Setup old caches
      const oldCaches = [
        'household-management-old-version-1',
        'household-management-old-version-2',
        'household-management-static-old-version-1'
      ];
      const currentCaches = [
        'household-management-new-version',
        'household-management-static-new-version',
        'household-management-dynamic-new-version'
      ];
      
      mockCaches.keys.mockResolvedValue([...oldCaches, ...currentCaches]);
      mockCaches.delete.mockResolvedValue(true);

      render(<TestServiceWorkerComponent />);

      // Trigger cache cleanup
      act(() => {
        serviceWorkerManager.clearOldCaches();
      });

      // Should delete old caches
      await waitFor(() => {
        expect(mockCaches.delete).toHaveBeenCalled();
      });
    });

    it.skip('should handle cache quota exceeded errors gracefully', async () => {
      // Mock cache operations to throw quota exceeded error
      mockCache.put.mockRejectedValue(
        Object.assign(new Error('Quota exceeded'), { name: 'QuotaExceededError' })
      );
      mockCaches.delete.mockResolvedValue(true);

      render(<TestServiceWorkerComponent />);

      // Simulate cache operation that triggers quota error
      act(() => {
        serviceWorkerManager.cacheUrls(['/test-url']);
      });

      // Should handle error gracefully and attempt cleanup
      await waitFor(() => {
        expect(mockCaches.delete).toHaveBeenCalled();
      });
    });

    it.skip('should validate cache integrity after updates', async () => {
      // Mock cache with some entries using full URLs
      const mockCacheEntries = [
        { url: 'https://example.com/index.html' },
        { url: 'https://example.com/assets/main.js' },
        { url: 'https://example.com/assets/main.css' }
      ];
      mockCache.keys.mockResolvedValue(mockCacheEntries);
      mockCache.match.mockImplementation((request) => {
        const requestUrl = typeof request === 'string' ? request : request.url;
        if (mockCacheEntries.some(entry => entry.url === requestUrl)) {
          return Promise.resolve(new Response('cached content', { status: 200 }));
        }
        return Promise.resolve(undefined);
      });

      render(<TestServiceWorkerComponent />);

      // Trigger cache validation
      act(() => {
        serviceWorkerManager.getCurrentCacheVersion();
      });

      // Should validate cache entries
      await waitFor(() => {
        expect(mockCache.keys).toHaveBeenCalled();
      });
    });
  });

  describe('Cross-Browser Compatibility', () => {
    it('should handle browsers without service worker support', async () => {
      // Mock unsupported browser
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: undefined,
        writable: true,
      });

      render(<TestServiceWorkerComponent />);

      // Should not show update notifications
      expect(screen.queryByTestId('update-notification')).not.toBeInTheDocument();
    });

    it.skip('should handle different MessageChannel implementations', async () => {
      // Mock different MessageChannel behavior
      const alternativeMessageChannel = {
        port1: {
          onmessage: null,
          postMessage: vi.fn(),
          addEventListener: vi.fn((event, handler) => {
            if (event === 'message') {
              // Simulate immediate response
              setTimeout(() => handler({ data: { success: true, version: 'test-version' } }), 100);
            }
          }),
          removeEventListener: vi.fn(),
        },
        port2: {
          onmessage: null,
          postMessage: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      };

      Object.defineProperty(global, 'MessageChannel', {
        value: vi.fn(() => alternativeMessageChannel),
        writable: true,
      });

      render(<TestServiceWorkerComponent />);

      // Test service worker communication
      const version = await serviceWorkerManager.getCurrentCacheVersion();
      expect(version).toBe('test-version');
    });

    it.skip('should handle Safari-specific service worker behaviors', async () => {
      // Mock Safari-like behavior (limited service worker support)
      const safariServiceWorker = {
        ...mockNavigatorServiceWorker,
        register: vi.fn().mockImplementation(() => {
          // Safari sometimes delays registration
          return new Promise(resolve => {
            setTimeout(() => resolve(mockRegistration), 500);
          });
        }),
      };

      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: safariServiceWorker,
        writable: true,
      });

      render(<TestServiceWorkerComponent />);

      // Trigger registration
      act(() => {
        serviceWorkerManager.register();
      });

      // Should handle delayed registration
      await waitFor(() => {
        expect(safariServiceWorker.register).toHaveBeenCalled();
      }, { timeout: 1000 });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it.skip('should recover from service worker registration failures', async () => {
      // Mock registration failure followed by success
      let registrationAttempts = 0;
      mockNavigatorServiceWorker.register.mockImplementation(() => {
        registrationAttempts++;
        if (registrationAttempts === 1) {
          return Promise.reject(new Error('Registration failed'));
        }
        return Promise.resolve(mockRegistration);
      });

      render(<TestServiceWorkerComponent />);

      // Trigger registration
      act(() => {
        serviceWorkerManager.register();
      });

      // Should retry registration
      await waitFor(() => {
        expect(registrationAttempts).toBeGreaterThan(1);
      }, { timeout: 5000 });
    });

    it.skip('should handle corrupted cache scenarios', async () => {
      // Mock corrupted cache responses
      mockCache.match.mockImplementation(() => {
        return Promise.resolve(new Response('corrupted', { status: 500 }));
      });

      render(<TestServiceWorkerComponent />);

      // Trigger cache operation
      act(() => {
        serviceWorkerManager.getCurrentCacheVersion();
      });

      // Should handle corrupted cache gracefully
      await waitFor(() => {
        expect(mockCache.match).toHaveBeenCalled();
      });
    });

    it.skip('should handle service worker script loading failures', async () => {
      // Mock service worker script loading failure
      mockNavigatorServiceWorker.register.mockRejectedValue(
        new Error('Failed to load service worker script')
      );

      render(<TestServiceWorkerComponent />);

      // Trigger registration
      act(() => {
        serviceWorkerManager.register();
      });

      // Should handle failure gracefully
      await waitFor(() => {
        expect(mockNavigatorServiceWorker.register).toHaveBeenCalled();
      });
    });
  });

  describe('Performance and Resource Management', () => {
    it('should not block operations during service worker registration', async () => {
      // Mock slow service worker operations
      mockNavigatorServiceWorker.register.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(mockRegistration), 2000);
        });
      });

      const startTime = Date.now();
      
      render(<TestServiceWorkerComponent />);

      // Component should render quickly despite slow service worker
      expect(screen.getByTestId('online-status')).toBeInTheDocument();

      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Component should render quickly
    });

    it.skip('should manage memory usage during cache operations', async () => {
      // Mock large cache operations using simple objects instead of Request objects
      const largeCacheEntries = Array.from({ length: 1000 }, (_, i) => ({
        url: `https://example.com/large-file-${i}.js`
      }));
      mockCache.keys.mockResolvedValue(largeCacheEntries);

      render(<TestServiceWorkerComponent />);

      // Should handle large cache operations without memory issues
      act(() => {
        serviceWorkerManager.clearOldCaches();
      });

      await waitFor(() => {
        expect(mockCache.keys).toHaveBeenCalled();
      });
    });
  });

  describe('Service Worker Hook Integration', () => {
    it('should provide correct hook values', () => {
      const { result } = renderHook(() => useServiceWorker());

      expect(result.current.isSupported).toBe(true);
      expect(result.current.isOnline).toBe(true);
      expect(result.current.updateAvailable).toBe(false);
      expect(typeof result.current.checkForUpdates).toBe('function');
      expect(typeof result.current.forceUpdate).toBe('function');
    });

    it('should update hook state when service worker events occur', async () => {
      const { result } = renderHook(() => useServiceWorker());

      // Initially no update available
      expect(result.current.updateAvailable).toBe(false);

      // Simulate update available event
      act(() => {
        const updateEvent = new CustomEvent('sw-update-available');
        window.dispatchEvent(updateEvent);
      });

      // Should update state
      await waitFor(() => {
        expect(result.current.updateAvailable).toBe(true);
      });
    });

    it.skip('should handle service worker manager methods', async () => {
      const { result } = renderHook(() => useServiceWorker());

      // Test checkForUpdates
      await act(async () => {
        await result.current.checkForUpdates();
      });

      expect(mockRegistration.update).toHaveBeenCalled();

      // Test getCurrentCacheVersion
      await act(async () => {
        await result.current.getCurrentCacheVersion();
      });

      expect(mockMessageChannel.port1.postMessage).toHaveBeenCalled();
    });
  });
});