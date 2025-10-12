# Service Worker Cache Fix Design Document

## Overview

This design addresses the aggressive caching issue in the current service worker implementation by switching from a "cache-first" to a "network-first" strategy for critical app resources. The solution ensures users always receive the latest version while maintaining offline functionality.

## Architecture

### Current Problem Analysis
- Service worker uses cache-first strategy (`caches.match()` before `fetch()`)
- Static cache version (`household-management-v1`) never changes
- No automatic cache invalidation on app updates
- Users get stale content until manual cache clearing

### Proposed Solution
- Implement network-first caching for app resources
- Add automatic cache versioning based on build hash
- Implement aggressive update checking and activation
- Maintain offline fallback capabilities

## Components and Interfaces

### 1. Enhanced Service Worker (`public/sw.js`)

**Cache Strategy Changes:**
- **Network-First for App Resources**: HTML, CSS, JS files fetch from network first
- **Cache-First for Static Assets**: Images, fonts, and other static content
- **Stale-While-Revalidate**: For API responses and dynamic content

**Cache Versioning:**
```javascript
// Dynamic cache names based on build hash
const BUILD_HASH = '__BUILD_HASH__'; // Replaced during build
const CACHE_NAME = `household-management-${BUILD_HASH}`;
```

**Update Detection:**
- Check for updates on every app load
- Compare current cache version with server version
- Force activation of new service workers

### 2. Build-Time Cache Busting

**Vite Configuration Enhancement:**
- Generate unique build hash for each deployment
- Replace placeholder in service worker during build
- Ensure proper cache headers for service worker file

**Implementation:**
```typescript
// vite.config.ts enhancement
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'sw-cache-busting',
      generateBundle() {
        // Generate build hash and replace in sw.js
      }
    }
  ],
  build: {
    rollupOptions: {
      output: {
        // Ensure service worker is not cached by browser
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'sw.js') {
            return 'sw.js?v=[hash]';
          }
          return '[name]-[hash][extname]';
        }
      }
    }
  }
});
```

### 3. Service Worker Manager Updates

**Enhanced Update Detection:**
```typescript
class ServiceWorkerManagerImpl {
  // Force update check on app load
  async checkForUpdates(): Promise<boolean>;
  
  // Aggressive update activation
  async forceUpdate(): Promise<void>;
  
  // Cache version management
  async getCurrentCacheVersion(): Promise<string>;
  async clearOldCaches(): Promise<void>;
}
```

### 4. User Interface Updates

**Update Notification Component:**
- Show prominent update available notification
- Provide "Update Now" action button
- Handle update process with loading states

## Data Models

### Cache Configuration
```typescript
interface CacheConfig {
  version: string;
  strategies: {
    [pattern: string]: 'network-first' | 'cache-first' | 'stale-while-revalidate';
  };
  maxAge: {
    [cacheType: string]: number; // in milliseconds
  };
}
```

### Update Status
```typescript
interface UpdateStatus {
  available: boolean;
  version: string;
  downloading: boolean;
  ready: boolean;
}
```

## Error Handling

### Network Failure Scenarios
1. **Complete Offline**: Serve from cache with offline indicator
2. **Partial Connectivity**: Retry with exponential backoff
3. **Service Worker Update Failure**: Fallback to current version

### Cache Corruption
1. **Invalid Cache Entries**: Clear and rebuild cache
2. **Version Mismatch**: Force cache refresh
3. **Storage Quota Exceeded**: Implement cache cleanup strategy

### Update Process Failures
1. **Download Interruption**: Resume or restart download
2. **Activation Failure**: Rollback to previous version
3. **User Cancellation**: Defer update to next session

## Testing Strategy

### Unit Tests
- Service worker caching logic
- Cache version management
- Update detection mechanisms
- Error handling scenarios

### Integration Tests
- End-to-end update flow
- Offline/online transitions
- Cache invalidation scenarios
- Cross-browser compatibility

### Manual Testing Scenarios
1. **Fresh Install**: Verify initial caching behavior
2. **App Update**: Test update detection and activation
3. **Offline Usage**: Confirm offline functionality
4. **Cache Clearing**: Validate cache cleanup processes
5. **Mobile Testing**: Specific testing on mobile devices

### Performance Testing
- Cache hit/miss ratios
- Update download times
- App startup performance
- Memory usage optimization

## Implementation Phases

### Phase 1: Core Service Worker Refactoring
- Implement network-first caching strategy
- Add dynamic cache versioning
- Update service worker registration logic

### Phase 2: Build Process Integration
- Add Vite plugin for cache busting
- Implement build hash generation
- Configure proper cache headers

### Phase 3: User Experience Enhancements
- Create update notification UI
- Add manual update controls
- Implement loading states and feedback

### Phase 4: Testing and Optimization
- Comprehensive testing across devices
- Performance optimization
- Error handling refinement

## Security Considerations

- Validate service worker integrity
- Prevent cache poisoning attacks
- Secure update mechanism
- Proper HTTPS enforcement

## Performance Implications

### Positive Impacts
- Users always get latest features and fixes
- Reduced support issues from stale content
- Better cache utilization for static assets

### Potential Concerns
- Slightly increased initial load time (network-first)
- More frequent network requests
- Mitigation: Smart caching for truly static content