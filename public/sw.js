// Service Worker for Household Management App
const BUILD_HASH = '__BUILD_HASH__'; // Replaced during build process
const CACHE_NAME = `household-management-${BUILD_HASH}`;
const STATIC_CACHE_NAME = `household-management-static-${BUILD_HASH}`;
const DYNAMIC_CACHE_NAME = `household-management-dynamic-${BUILD_HASH}`;

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  // Add other static assets as needed
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static files', error);
      })
  );
});

// Activate event - aggressive cache cleanup and versioning
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating with aggressive cache cleanup...');
  
  event.waitUntil(
    Promise.all([
      cleanupOldCaches(),
      validateCurrentCaches(),
      self.clients.claim() // Take control of all pages
    ])
      .then(() => {
        console.log('Service Worker: Activated with clean cache state');
        // Notify clients about successful activation
        return notifyClientsOfActivation();
      })
      .catch((error) => {
        console.error('Service Worker: Activation failed', error);
        throw error;
      })
  );
});

// Aggressive cache cleanup function
async function cleanupOldCaches() {
  try {
    const cacheNames = await caches.keys();
    const currentCaches = new Set([CACHE_NAME, STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME]);
    
    console.log('Service Worker: Current cache version:', BUILD_HASH);
    console.log('Service Worker: Found caches:', cacheNames);
    console.log('Service Worker: Current caches to preserve:', Array.from(currentCaches));
    
    // Delete all caches that don't match current version
    const deletionPromises = cacheNames.map(async (cacheName) => {
      // Check if this is a household-management cache
      if (cacheName.startsWith('household-management-')) {
        // If it's not one of our current caches, delete it
        if (!currentCaches.has(cacheName)) {
          console.log('Service Worker: Deleting old cache version:', cacheName);
          const deleted = await caches.delete(cacheName);
          if (deleted) {
            console.log('Service Worker: Successfully deleted cache:', cacheName);
          } else {
            console.warn('Service Worker: Failed to delete cache:', cacheName);
          }
          return deleted;
        } else {
          console.log('Service Worker: Preserving current cache:', cacheName);
          return false;
        }
      }
      
      // Delete any other caches that might be from old versions or other apps
      // that could interfere with our app
      const isOldVersionCache = cacheName.includes('household') || 
                               cacheName.includes('management') ||
                               cacheName.match(/^v\d+/) || // Version pattern like v1, v2, etc.
                               cacheName.match(/^\d+/); // Numeric version pattern
      
      if (isOldVersionCache && !currentCaches.has(cacheName)) {
        console.log('Service Worker: Deleting potentially old cache:', cacheName);
        const deleted = await caches.delete(cacheName);
        if (deleted) {
          console.log('Service Worker: Successfully deleted old cache:', cacheName);
        }
        return deleted;
      }
      
      return false;
    });
    
    const deletionResults = await Promise.all(deletionPromises);
    const deletedCount = deletionResults.filter(Boolean).length;
    
    console.log(`Service Worker: Cache cleanup completed. Deleted ${deletedCount} old caches.`);
    
    // Log final cache state
    const remainingCaches = await caches.keys();
    console.log('Service Worker: Remaining caches after cleanup:', remainingCaches);
    
    return deletedCount;
  } catch (error) {
    console.error('Service Worker: Cache cleanup failed:', error);
    throw error;
  }
}

// Validate current caches and ensure they're properly initialized
async function validateCurrentCaches() {
  try {
    console.log('Service Worker: Validating current cache versions...');
    
    const cacheValidations = await Promise.all([
      validateCache(CACHE_NAME, 'main'),
      validateCache(STATIC_CACHE_NAME, 'static'),
      validateCache(DYNAMIC_CACHE_NAME, 'dynamic')
    ]);
    
    const validCaches = cacheValidations.filter(Boolean).length;
    console.log(`Service Worker: ${validCaches}/3 caches validated successfully`);
    
    return validCaches === 3;
  } catch (error) {
    console.error('Service Worker: Cache validation failed:', error);
    return false;
  }
}

// Validate individual cache
async function validateCache(cacheName, cacheType) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    console.log(`Service Worker: ${cacheType} cache (${cacheName}) contains ${keys.length} entries`);
    
    // For static cache, ensure it has the essential files
    if (cacheType === 'static' && keys.length === 0) {
      console.log('Service Worker: Static cache is empty, will be populated on next request');
    }
    
    return true;
  } catch (error) {
    console.error(`Service Worker: Failed to validate ${cacheType} cache:`, error);
    return false;
  }
}

// Notify clients about successful activation
async function notifyClientsOfActivation() {
  try {
    const clients = await self.clients.matchAll();
    const message = {
      type: 'SERVICE_WORKER_ACTIVATED',
      version: BUILD_HASH,
      timestamp: Date.now(),
      caches: {
        main: CACHE_NAME,
        static: STATIC_CACHE_NAME,
        dynamic: DYNAMIC_CACHE_NAME
      }
    };
    
    clients.forEach(client => {
      client.postMessage(message);
    });
    
    console.log(`Service Worker: Notified ${clients.length} clients of activation`);
  } catch (error) {
    console.error('Service Worker: Failed to notify clients of activation:', error);
  }
}

// Get comprehensive cache information
async function getCacheInfo() {
  try {
    const cacheNames = await caches.keys();
    const cacheInfo = {
      version: BUILD_HASH,
      timestamp: Date.now(),
      currentCaches: {
        main: CACHE_NAME,
        static: STATIC_CACHE_NAME,
        dynamic: DYNAMIC_CACHE_NAME
      },
      allCaches: [],
      totalSize: 0,
      householdCaches: [],
      otherCaches: []
    };
    
    // Analyze each cache
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      let cacheSize = 0;
      const entries = [];
      
      // Calculate approximate cache size and collect entries
      for (const request of keys) {
        try {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            cacheSize += blob.size;
            entries.push({
              url: request.url,
              size: blob.size,
              type: response.headers.get('content-type') || 'unknown'
            });
          }
        } catch (error) {
          console.warn('Service Worker: Failed to analyze cache entry:', request.url, error);
        }
      }
      
      const cacheData = {
        name: cacheName,
        entryCount: keys.length,
        size: cacheSize,
        entries: entries,
        isCurrentVersion: Object.values(cacheInfo.currentCaches).includes(cacheName),
        isHouseholdCache: cacheName.startsWith('household-management-')
      };
      
      cacheInfo.allCaches.push(cacheData);
      cacheInfo.totalSize += cacheSize;
      
      if (cacheData.isHouseholdCache) {
        cacheInfo.householdCaches.push(cacheData);
      } else {
        cacheInfo.otherCaches.push(cacheData);
      }
    }
    
    // Add summary statistics
    cacheInfo.summary = {
      totalCaches: cacheNames.length,
      householdCaches: cacheInfo.householdCaches.length,
      currentVersionCaches: cacheInfo.householdCaches.filter(c => c.isCurrentVersion).length,
      oldVersionCaches: cacheInfo.householdCaches.filter(c => !c.isCurrentVersion).length,
      otherCaches: cacheInfo.otherCaches.length,
      totalSizeMB: Math.round(cacheInfo.totalSize / (1024 * 1024) * 100) / 100
    };
    
    console.log('Service Worker: Cache info collected:', cacheInfo.summary);
    return cacheInfo;
  } catch (error) {
    console.error('Service Worker: Failed to get cache info:', error);
    throw error;
  }
}

// Fetch event - network-first for app resources, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Firebase and external API requests (let them fail gracefully)
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') ||
      url.hostname.includes('google.com')) {
    return;
  }

  // Determine caching strategy based on resource type
  const isAppResource = isAppResourceRequest(request);
  const isStaticAsset = isStaticAssetRequest(request);

  if (isAppResource) {
    // Network-first strategy for HTML, CSS, JS files
    event.respondWith(networkFirstStrategy(request));
  } else if (isStaticAsset) {
    // Cache-first strategy for images, fonts, etc.
    event.respondWith(cacheFirstStrategy(request));
  } else {
    // Stale-while-revalidate for other resources
    event.respondWith(staleWhileRevalidateStrategy(request));
  }
});

// Helper function to identify app resources (HTML, CSS, JS)
function isAppResourceRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Navigation requests (HTML)
  if (request.destination === 'document') {
    return true;
  }
  
  // CSS and JS files
  if (request.destination === 'style' || request.destination === 'script') {
    return true;
  }
  
  // Check file extensions
  return pathname.endsWith('.html') || 
         pathname.endsWith('.css') || 
         pathname.endsWith('.js') ||
         pathname.endsWith('.mjs');
}

// Helper function to identify static assets
function isStaticAssetRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Images, fonts, and other static assets
  return request.destination === 'image' ||
         request.destination === 'font' ||
         pathname.endsWith('.png') ||
         pathname.endsWith('.jpg') ||
         pathname.endsWith('.jpeg') ||
         pathname.endsWith('.gif') ||
         pathname.endsWith('.svg') ||
         pathname.endsWith('.webp') ||
         pathname.endsWith('.ico') ||
         pathname.endsWith('.woff') ||
         pathname.endsWith('.woff2') ||
         pathname.endsWith('.ttf') ||
         pathname.endsWith('.eot');
}

// Enhanced network-first caching strategy with comprehensive error handling
async function networkFirstStrategy(request) {
  const url = new URL(request.url);
  console.log('Service Worker: Enhanced network-first strategy for', request.url);
  
  try {
    // Try network first with retry logic
    const networkResponse = await enhancedFetch(request, 'network-first');
    
    // Cache successful responses using safe caching
    if (networkResponse && networkResponse.status === 200) {
      await safeCache(CACHE_NAME, request, networkResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed after retries, trying cache for', request.url);
    
    // Fallback to cache with graceful error handling
    try {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('Service Worker: Serving from cache fallback', request.url);
        return cachedResponse;
      }
    } catch (cacheError) {
      console.error('Service Worker: Cache lookup failed:', cacheError);
    }
    
    // For navigation requests, serve offline fallback
    if (request.destination === 'document') {
      try {
        const offlineFallback = await caches.match('/index.html');
        if (offlineFallback) {
          console.log('Service Worker: Serving offline fallback page');
          return offlineFallback;
        }
      } catch (fallbackError) {
        console.error('Service Worker: Offline fallback failed:', fallbackError);
      }
    }
    
    // No cache available, return a meaningful error response for app resources
    if (isAppResourceRequest(request)) {
      console.log('Service Worker: Returning offline error page for app resource');
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Offline</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline { color: #666; }
          </style>
        </head>
        <body>
          <div class="offline">
            <h1>You're Offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </div>
        </body>
        </html>`,
        {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }
    
    // For other resources, let the request fail
    throw error;
  }
}

// Enhanced cache-first caching strategy for static assets
async function cacheFirstStrategy(request) {
  console.log('Service Worker: Enhanced cache-first strategy for', request.url);
  
  // Check cache first with error handling
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('Service Worker: Serving static asset from cache', request.url);
      return cachedResponse;
    }
  } catch (cacheError) {
    console.error('Service Worker: Cache lookup failed for static asset:', cacheError);
  }
  
  // Fetch from network with retry and safe caching
  try {
    const networkResponse = await enhancedFetch(request, 'cache-first');
    
    if (networkResponse && networkResponse.status === 200) {
      await safeCache(STATIC_CACHE_NAME, request, networkResponse);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Failed to fetch static asset after retries:', request.url, error);
    
    // For critical static assets, try to serve a placeholder or fallback
    if (isStaticAssetRequest(request)) {
      const url = new URL(request.url);
      
      // For images, return a simple placeholder
      if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i)) {
        console.log('Service Worker: Returning image placeholder for failed static asset');
        return new Response(
          '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f0f0f0"/><text x="50" y="50" text-anchor="middle" dy=".3em" font-family="Arial" font-size="12" fill="#999">Image unavailable</text></svg>',
          {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'image/svg+xml' }
          }
        );
      }
    }
    
    throw error;
  }
}

// Enhanced stale-while-revalidate strategy for other resources
async function staleWhileRevalidateStrategy(request) {
  console.log('Service Worker: Enhanced stale-while-revalidate strategy for', request.url);
  
  // Check cache first with error handling
  let cachedResponse;
  try {
    cachedResponse = await caches.match(request);
  } catch (cacheError) {
    console.error('Service Worker: Cache lookup failed for stale-while-revalidate:', cacheError);
  }
  
  // Fetch from network in background to update cache with enhanced error handling
  const networkResponsePromise = enhancedFetch(request, 'network-first')
    .then(async (networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        await safeCache(DYNAMIC_CACHE_NAME, request, networkResponse);
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log('Service Worker: Background update failed with enhanced fetch:', request.url, error);
      return null;
    });
  
  // Return cached response immediately if available, otherwise wait for network
  if (cachedResponse) {
    console.log('Service Worker: Serving stale content while revalidating', request.url);
    return cachedResponse;
  }
  
  // No cache available, wait for network response with enhanced error handling
  try {
    const networkResponse = await networkResponsePromise;
    if (networkResponse) {
      return networkResponse;
    } else {
      throw new Error('Network request failed and no cache available');
    }
  } catch (error) {
    console.error('Service Worker: Stale-while-revalidate failed completely:', request.url, error);
    
    // Return a generic error response for API-like requests
    const url = new URL(request.url);
    if (url.pathname.includes('/api/') || request.headers.get('accept')?.includes('application/json')) {
      console.log('Service Worker: Returning error response for API request');
      return new Response(
        JSON.stringify({
          error: 'Service temporarily unavailable',
          message: 'Please check your internet connection and try again',
          offline: true
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'household-sync') {
    event.waitUntil(
      syncOfflineOperations()
    );
  }
});

// Sync offline operations when back online
async function syncOfflineOperations() {
  try {
    console.log('Service Worker: Syncing offline operations...');
    
    // Get all clients (open tabs/windows)
    const clients = await self.clients.matchAll();
    
    // Notify clients to perform sync
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        action: 'SYNC_OFFLINE_OPERATIONS'
      });
    });
    
    console.log('Service Worker: Sync notification sent to clients');
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

// Enhanced error handling utilities
const ERROR_RETRY_DELAYS = [1000, 3000, 10000]; // Exponential backoff delays
const MAX_RETRY_ATTEMPTS = 3;

// Retry mechanism with exponential backoff
async function retryWithBackoff(operation, context = 'unknown', maxRetries = MAX_RETRY_ATTEMPTS) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Service Worker: Attempting ${context} (${attempt + 1}/${maxRetries})`);
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`Service Worker: ${context} attempt ${attempt + 1} failed:`, error);
      
      // If this isn't the last attempt, wait before retrying
      if (attempt < maxRetries - 1) {
        const delay = ERROR_RETRY_DELAYS[Math.min(attempt, ERROR_RETRY_DELAYS.length - 1)];
        console.log(`Service Worker: Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`Service Worker: ${context} failed after ${maxRetries} attempts:`, lastError);
  throw lastError;
}

// Enhanced network request with fallback strategies
async function enhancedFetch(request, strategy = 'network-first') {
  const url = new URL(request.url);
  const context = `fetch ${url.pathname}`;
  
  try {
    switch (strategy) {
      case 'network-first':
        return await retryWithBackoff(async () => {
          const response = await fetch(request);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response;
        }, context);
        
      case 'cache-first':
        // Try cache first, then network with retry
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        return await retryWithBackoff(async () => {
          const response = await fetch(request);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response;
        }, context);
        
      default:
        return await fetch(request);
    }
  } catch (error) {
    console.error(`Service Worker: Enhanced fetch failed for ${url.pathname}:`, error);
    throw error;
  }
}

// Graceful cache operation with error handling
async function safeCache(cacheName, request, response) {
  try {
    // Validate response before caching
    if (!response || response.status !== 200 || response.type !== 'basic') {
      console.log(`Service Worker: Skipping cache for invalid response: ${request.url}`);
      return false;
    }
    
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    console.log(`Service Worker: Successfully cached: ${request.url}`);
    return true;
  } catch (error) {
    console.error(`Service Worker: Failed to cache ${request.url}:`, error);
    
    // If quota exceeded, try to clean up old caches
    if (error.name === 'QuotaExceededError') {
      console.log('Service Worker: Quota exceeded, attempting cache cleanup...');
      try {
        await cleanupOldCaches();
        // Retry caching after cleanup
        const cache = await caches.open(cacheName);
        await cache.put(request, response.clone());
        console.log(`Service Worker: Successfully cached after cleanup: ${request.url}`);
        return true;
      } catch (cleanupError) {
        console.error('Service Worker: Cache cleanup and retry failed:', cleanupError);
      }
    }
    
    return false;
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  const { type, action } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      // Cache specific URLs on demand
      if (action && action.urls) {
        caches.open(DYNAMIC_CACHE_NAME)
          .then(cache => cache.addAll(action.urls))
          .then(() => {
            event.ports[0].postMessage({ success: true });
          })
          .catch(error => {
            event.ports[0].postMessage({ success: false, error: error.message });
          });
      }
      break;
      
    case 'CLEAR_CACHE':
      // Clear all caches
      caches.keys()
        .then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
        })
        .then(() => {
          event.ports[0].postMessage({ success: true });
        })
        .catch(error => {
          event.ports[0].postMessage({ success: false, error: error.message });
        });
      break;
      
    case 'FORCE_CACHE_CLEANUP':
      // Force aggressive cache cleanup
      cleanupOldCaches()
        .then((deletedCount) => {
          event.ports[0].postMessage({ 
            success: true, 
            deletedCount,
            currentVersion: BUILD_HASH 
          });
        })
        .catch(error => {
          event.ports[0].postMessage({ 
            success: false, 
            error: error.message 
          });
        });
      break;
      
    case 'GET_CACHE_INFO':
      // Get current cache information
      getCacheInfo()
        .then((cacheInfo) => {
          event.ports[0].postMessage({ 
            success: true, 
            cacheInfo 
          });
        })
        .catch(error => {
          event.ports[0].postMessage({ 
            success: false, 
            error: error.message 
          });
        });
      break;
      
    case 'VALIDATE_CACHES':
      // Validate current cache state
      validateCurrentCaches()
        .then((isValid) => {
          event.ports[0].postMessage({ 
            success: true, 
            isValid,
            version: BUILD_HASH 
          });
        })
        .catch(error => {
          event.ports[0].postMessage({ 
            success: false, 
            error: error.message 
          });
        });
      break;
      
    case 'GET_CACHE_VERSION':
      // Get current cache version
      event.ports[0].postMessage({ 
        success: true, 
        version: BUILD_HASH 
      });
      break;
      
    case 'CLEAR_OLD_CACHES':
      // Clear old cache versions, keeping only current
      cleanupOldCaches()
        .then((deletedCount) => {
          event.ports[0].postMessage({ 
            success: true, 
            deletedCount,
            currentVersion: BUILD_HASH 
          });
        })
        .catch(error => {
          event.ports[0].postMessage({ 
            success: false, 
            error: error.message 
          });
        });
      break;
      
    default:
      console.log('Service Worker: Unknown message type', type);
  }
});

// Push notification handling (for future use)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received', event);
  
  const options = {
    body: 'You have pending household tasks!',
    icon: '/vite.svg',
    badge: '/vite.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Tasks',
        icon: '/vite.svg'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/vite.svg'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Household Management', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});