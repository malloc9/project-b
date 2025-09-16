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
}

class ServiceWorkerManagerImpl implements ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private onlineListeners: ((isOnline: boolean) => void)[] = [];
  private isOnlineState = navigator.onLine;

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
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New service worker installed, ready to activate');
              // Notify user about update availability
              this.notifyUpdateAvailable();
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

  // Activate waiting service worker
  activateWaitingServiceWorker(): void {
    if (!navigator.serviceWorker.controller) {
      return;
    }

    navigator.serviceWorker.controller.postMessage({
      type: 'SKIP_WAITING'
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