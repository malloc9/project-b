export interface ServiceWorkerManager {
  register: () => Promise<ServiceWorkerRegistration | null>;
  unregister: () => Promise<boolean>;
  update: () => Promise<void>;
  isSupported: () => boolean;
  isOnline: () => boolean;
  onOnlineStatusChange: (callback: (isOnline: boolean) => void) => () => void;
  requestBackgroundSync: (tag: string) => Promise<void>;
  cacheUrls: (urls: string[]) => Promise<boolean>;
  clearCache: () => Promise<boolean>;
  checkForUpdates: () => Promise<boolean>;
  forceUpdate: () => Promise<void>;
  getCurrentCacheVersion: () => Promise<string | null>;
  clearOldCaches: () => Promise<boolean>;
  // Enhanced error handling methods
  retryUpdate: (maxRetries?: number) => Promise<void>;
  recoverFromFailedUpdate: () => Promise<boolean>;
  validateServiceWorkerHealth: () => Promise<boolean>;
  getUpdateErrorHistory: () => UpdateError[];
  clearUpdateErrorHistory: () => void;
}

export interface UpdateError {
  timestamp: Date;
  error: string;
  context: string;
  retryCount: number;
  resolved: boolean;
}

class ServiceWorkerManagerImpl implements ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private onlineListeners: ((isOnline: boolean) => void)[] = [];
  private isOnlineState = navigator.onLine;
  private updateErrorHistory: UpdateError[] = [];
  private currentRetryCount = 0;
  private maxRetryAttempts = 3;
  private retryTimeouts: number[] = [1000, 3000, 10000]; // Exponential backoff in ms

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnlineState = true;
      this.notifyOnlineStatusChange();
      this.handleOnlineEvent();
    });

    window.addEventListener('offline', () => {
      this.isOnlineState = false;
      this.notifyOnlineStatusChange();
    });

    // Listen for service worker messages
    navigator.serviceWorker?.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
  }

  // Check if service workers are supported
  isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  // Get current online status
  isOnline(): boolean {
    return this.isOnlineState;
  }

  // Subscribe to online status changes
  onOnlineStatusChange(callback: (isOnline: boolean) => void): () => void {
    this.onlineListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.onlineListeners.indexOf(callback);
      if (index > -1) {
        this.onlineListeners.splice(index, 1);
      }
    };
  }

  // Register the service worker
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      console.warn('Service workers are not supported in this browser');
      return null;
    }

    try {
      console.log('Registering service worker...');
      
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service worker registered successfully:', this.registration);

      // Handle service worker updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing;
        if (newWorker) {
          console.log('New service worker found, installing...');
          this.notifyUpdateDownloading();
          
          newWorker.addEventListener('statechange', () => {
            switch (newWorker.state) {
              case 'installing':
                console.log('New service worker installing...');
                this.notifyUpdateInstalling();
                break;
              case 'installed':
                if (navigator.serviceWorker.controller) {
                  console.log('New service worker installed, ready to activate');
                  this.notifyUpdateAvailable();
                } else {
                  console.log('New service worker installed, no controller');
                }
                break;
              case 'activating':
                console.log('New service worker activating...');
                break;
              case 'activated':
                console.log('New service worker activated');
                break;
              case 'redundant':
                console.log('New service worker became redundant');
                this.notifyUpdateError('Service worker became redundant');
                break;
            }
          });
        }
      });

      return this.registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  }

  // Unregister the service worker
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      console.log('Service worker unregistered:', result);
      this.registration = null;
      return result;
    } catch (error) {
      console.error('Service worker unregistration failed:', error);
      return false;
    }
  }

  // Update the service worker
  async update(): Promise<void> {
    if (!this.registration) {
      throw new Error('No service worker registration found');
    }

    try {
      await this.registration.update();
      console.log('Service worker update check completed');
    } catch (error) {
      console.error('Service worker update failed:', error);
      throw error;
    }
  }

  // Request background sync
  async requestBackgroundSync(tag: string): Promise<void> {
    if (!this.registration || !this.registration.sync) {
      console.warn('Background sync not supported');
      return;
    }

    try {
      await this.registration.sync.register(tag);
      console.log('Background sync registered:', tag);
    } catch (error) {
      console.error('Background sync registration failed:', error);
      throw error;
    }
  }

  // Cache specific URLs
  async cacheUrls(urls: string[]): Promise<boolean> {
    if (!navigator.serviceWorker.controller) {
      console.warn('No active service worker to handle cache request');
      return false;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success);
      };

      navigator.serviceWorker.controller!.postMessage(
        {
          type: 'CACHE_URLS',
          action: { urls }
        },
        [messageChannel.port2]
      );
    });
  }

  // Clear all caches
  async clearCache(): Promise<boolean> {
    if (!navigator.serviceWorker.controller) {
      console.warn('No active service worker to handle clear cache request');
      return false;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success);
      };

      navigator.serviceWorker.controller!.postMessage(
        {
          type: 'CLEAR_CACHE'
        },
        [messageChannel.port2]
      );
    });
  }

  // Handle service worker messages
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, action } = event.data;

    switch (type) {
      case 'BACKGROUND_SYNC':
        if (action === 'SYNC_OFFLINE_OPERATIONS') {
          console.log('Service worker requested offline sync');
          // Dispatch custom event for the app to handle
          window.dispatchEvent(new CustomEvent('sw-sync-request'));
        }
        break;

      default:
        console.log('Unknown service worker message:', event.data);
    }
  }

  // Handle coming back online
  private handleOnlineEvent(): void {
    console.log('App came back online');
    
    // Request background sync when coming back online
    this.requestBackgroundSync('household-sync').catch(error => {
      console.error('Failed to request background sync:', error);
    });
  }

  // Notify listeners about online status changes
  private notifyOnlineStatusChange(): void {
    this.onlineListeners.forEach(listener => {
      try {
        listener(this.isOnlineState);
      } catch (error) {
        console.error('Error in online status listener:', error);
      }
    });
  }

  // Notify about service worker updates
  private notifyUpdateAvailable(): void {
    // Dispatch custom event for the app to handle
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  }

  // Notify about update downloading
  private notifyUpdateDownloading(): void {
    window.dispatchEvent(new CustomEvent('sw-update-downloading'));
  }

  // Notify about update installing
  private notifyUpdateInstalling(): void {
    window.dispatchEvent(new CustomEvent('sw-update-installing'));
  }

  // Notify about update errors
  private notifyUpdateError(error: string): void {
    window.dispatchEvent(new CustomEvent('sw-update-error', { 
      detail: { error } 
    }));
  }

  // Activate waiting service worker
  activateWaitingServiceWorker(): void {
    if (!navigator.serviceWorker.controller) {
      return;
    }

    navigator.serviceWorker.controller.postMessage({
      type: 'SKIP_WAITING'
    });
  }

  // Force check for service worker updates
  async checkForUpdates(): Promise<boolean> {
    if (!this.registration) {
      console.warn('No service worker registration found for update check');
      this.notifyUpdateError('No service worker registration found');
      return false;
    }

    try {
      console.log('Checking for service worker updates...');
      
      // Force update check by calling update() on registration
      await this.registration.update();
      
      // Check if there's a waiting service worker (indicates update available)
      const hasUpdate = !!this.registration.waiting || !!this.registration.installing;
      
      if (hasUpdate) {
        console.log('Service worker update detected');
        this.notifyUpdateAvailable();
      } else {
        console.log('No service worker updates available');
      }
      
      return hasUpdate;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check for updates';
      console.error('Failed to check for service worker updates:', error);
      this.notifyUpdateError(errorMessage);
      return false;
    }
  }

  // Force immediate activation of new service worker
  async forceUpdate(): Promise<void> {
    if (!this.registration) {
      const errorMessage = 'No service worker registration found';
      this.notifyUpdateError(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      console.log('Forcing service worker update...');
      
      // If there's a waiting service worker, activate it immediately
      if (this.registration.waiting) {
        console.log('Activating waiting service worker');
        
        // Send skip waiting message to the waiting service worker
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Wait for the new service worker to take control with timeout
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
            reject(new Error('Timeout waiting for service worker activation'));
          }, 10000);

          const handleControllerChange = () => {
            clearTimeout(timeout);
            navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
            resolve();
          };
          navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
        });
        
        console.log('Service worker updated and activated');
      } else {
        // No waiting service worker, check for updates first
        const hasUpdate = await this.checkForUpdates();
        if (!hasUpdate) {
          console.log('No updates available to force');
          return;
        }
        
        // Recursively call forceUpdate after checking for updates
        await this.forceUpdate();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to force service worker update';
      console.error('Failed to force service worker update:', error);
      this.notifyUpdateError(errorMessage);
      throw error;
    }
  }

  // Get current cache version from service worker
  async getCurrentCacheVersion(): Promise<string | null> {
    if (!navigator.serviceWorker.controller) {
      console.warn('No active service worker to get cache version from');
      return null;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.version || null);
      };

      // Set timeout to avoid hanging
      const timeout = setTimeout(() => {
        resolve(null);
      }, 5000);

      messageChannel.port1.addEventListener('message', () => {
        clearTimeout(timeout);
      }, { once: true });

      navigator.serviceWorker.controller.postMessage(
        {
          type: 'GET_CACHE_VERSION'
        },
        [messageChannel.port2]
      );
    });
  }

  // Clear old cache versions, keeping only current
  async clearOldCaches(): Promise<boolean> {
    if (!navigator.serviceWorker.controller) {
      console.warn('No active service worker to handle cache cleanup');
      return false;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success || false);
      };

      // Set timeout to avoid hanging
      const timeout = setTimeout(() => {
        resolve(false);
      }, 10000);

      messageChannel.port1.addEventListener('message', () => {
        clearTimeout(timeout);
      }, { once: true });

      navigator.serviceWorker.controller.postMessage(
        {
          type: 'CLEAR_OLD_CACHES'
        },
        [messageChannel.port2]
      );
    });
  }

  // Enhanced error handling methods

  // Retry update with exponential backoff
  async retryUpdate(maxRetries: number = this.maxRetryAttempts): Promise<void> {
    const context = 'retryUpdate';
    console.log(`Service Worker: Attempting update retry (${this.currentRetryCount + 1}/${maxRetries})`);

    if (this.currentRetryCount >= maxRetries) {
      const error = `Maximum retry attempts (${maxRetries}) exceeded`;
      this.logUpdateError(error, context, this.currentRetryCount);
      this.currentRetryCount = 0;
      throw new Error(error);
    }

    try {
      // Wait for exponential backoff delay
      const delay = this.retryTimeouts[Math.min(this.currentRetryCount, this.retryTimeouts.length - 1)];
      console.log(`Service Worker: Waiting ${delay}ms before retry...`);
      await this.delay(delay);

      // Check if we're online before attempting retry
      if (!this.isOnline()) {
        console.log('Service Worker: Offline, waiting for network connection...');
        await this.waitForOnline();
      }

      // Validate service worker health before retry
      const isHealthy = await this.validateServiceWorkerHealth();
      if (!isHealthy) {
        console.log('Service Worker: Health check failed, attempting recovery...');
        const recovered = await this.recoverFromFailedUpdate();
        if (!recovered) {
          throw new Error('Service worker recovery failed');
        }
      }

      // Attempt the update
      this.currentRetryCount++;
      await this.forceUpdate();
      
      // Success - reset retry count and mark errors as resolved
      this.currentRetryCount = 0;
      this.markErrorsAsResolved(context);
      console.log('Service Worker: Update retry successful');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Update retry failed';
      console.error(`Service Worker: Retry attempt ${this.currentRetryCount} failed:`, error);
      
      this.logUpdateError(errorMessage, context, this.currentRetryCount);

      // If we haven't exceeded max retries, try again
      if (this.currentRetryCount < maxRetries) {
        return this.retryUpdate(maxRetries);
      } else {
        // Max retries exceeded, reset count and throw
        this.currentRetryCount = 0;
        throw new Error(`Update failed after ${maxRetries} attempts: ${errorMessage}`);
      }
    }
  }

  // Recover from failed update by re-registering service worker
  async recoverFromFailedUpdate(): Promise<boolean> {
    const context = 'recoverFromFailedUpdate';
    console.log('Service Worker: Attempting recovery from failed update...');

    try {
      // First, try to validate current registration
      if (this.registration) {
        try {
          await this.registration.update();
          console.log('Service Worker: Existing registration is responsive');
          return true;
        } catch (error) {
          console.log('Service Worker: Existing registration is unresponsive, will re-register');
        }
      }

      // Unregister current service worker if it exists
      if (this.registration) {
        try {
          await this.unregister();
          console.log('Service Worker: Successfully unregistered failed service worker');
        } catch (error) {
          console.warn('Service Worker: Failed to unregister, continuing with recovery:', error);
        }
      }

      // Clear all caches to start fresh
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('Service Worker: Cleared all caches for fresh start');
      } catch (error) {
        console.warn('Service Worker: Failed to clear caches during recovery:', error);
      }

      // Wait a moment for cleanup to complete
      await this.delay(1000);

      // Re-register service worker
      const newRegistration = await this.register();
      if (newRegistration) {
        console.log('Service Worker: Successfully recovered with new registration');
        return true;
      } else {
        this.logUpdateError('Failed to re-register service worker during recovery', context, 0);
        return false;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Recovery failed';
      console.error('Service Worker: Recovery failed:', error);
      this.logUpdateError(errorMessage, context, 0);
      return false;
    }
  }

  // Validate service worker health
  async validateServiceWorkerHealth(): Promise<boolean> {
    const context = 'validateServiceWorkerHealth';
    console.log('Service Worker: Validating service worker health...');

    try {
      // Check if service worker is supported
      if (!this.isSupported()) {
        console.log('Service Worker: Not supported in this browser');
        return false;
      }

      // Check if we have a registration
      if (!this.registration) {
        console.log('Service Worker: No registration found');
        return false;
      }

      // Check registration state
      if (!this.registration.active && !this.registration.waiting && !this.registration.installing) {
        console.log('Service Worker: No active, waiting, or installing service worker');
        return false;
      }

      // Test communication with service worker
      try {
        const version = await this.getCurrentCacheVersion();
        console.log('Service Worker: Communication test successful, version:', version);
        return true;
      } catch (error) {
        console.log('Service Worker: Communication test failed:', error);
        return false;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Health validation failed';
      console.error('Service Worker: Health validation error:', error);
      this.logUpdateError(errorMessage, context, 0);
      return false;
    }
  }

  // Get update error history
  getUpdateErrorHistory(): UpdateError[] {
    return [...this.updateErrorHistory];
  }

  // Clear update error history
  clearUpdateErrorHistory(): void {
    this.updateErrorHistory = [];
    console.log('Service Worker: Update error history cleared');
  }

  // Private helper methods for error handling

  private logUpdateError(error: string, context: string, retryCount: number): void {
    const updateError: UpdateError = {
      timestamp: new Date(),
      error,
      context,
      retryCount,
      resolved: false
    };

    this.updateErrorHistory.push(updateError);
    
    // Keep only last 10 errors to prevent memory issues
    if (this.updateErrorHistory.length > 10) {
      this.updateErrorHistory = this.updateErrorHistory.slice(-10);
    }

    console.error(`Service Worker Error [${context}]:`, error);
    this.notifyUpdateError(`${context}: ${error}`);
  }

  private markErrorsAsResolved(context: string): void {
    this.updateErrorHistory
      .filter(error => error.context === context && !error.resolved)
      .forEach(error => {
        error.resolved = true;
      });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private waitForOnline(timeout: number = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isOnline()) {
        resolve();
        return;
      }

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout waiting for online connection'));
      }, timeout);

      const handleOnline = () => {
        cleanup();
        resolve();
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        window.removeEventListener('online', handleOnline);
      };

      window.addEventListener('online', handleOnline);
    });
  }
}

// Create singleton instance
export const serviceWorkerManager = new ServiceWorkerManagerImpl();

// Auto-register service worker in production
if (import.meta.env.PROD && serviceWorkerManager.isSupported()) {
  serviceWorkerManager.register().catch(error => {
    console.error('Failed to register service worker:', error);
  });
}