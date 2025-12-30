# Implementation Plan

- [x] 1. Create Vite plugin for service worker cache busting
  - Write a custom Vite plugin that generates a unique build hash for each deployment
  - Replace the `__BUILD_HASH__` placeholder in the service worker file during build
  - Configure the plugin to run during the build process
  - _Requirements: 5.1, 5.2_

- [x] 2. Update Vite configuration for proper cache headers
  - Modify `vite.config.ts` to include the cache busting plugin
  - Configure build options to prevent service worker caching by the browser
  - Set up proper asset naming for cache invalidation
  - _Requirements: 5.1, 5.3_

- [x] 3. Refactor service worker to use network-first caching strategy
  - Replace cache-first logic with network-first for HTML, CSS, and JS files
  - Implement dynamic cache naming using build hash placeholder
  - Update fetch event handler to prioritize network requests over cache
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Implement aggressive cache cleanup and versioning
  - Add logic to delete old cache versions during service worker activation
  - Implement cache version comparison and cleanup
  - Ensure only current version caches are preserved
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 5. Add automatic update detection and activation
  - Implement immediate service worker activation using `skipWaiting()`
  - Add logic to check for updates on every app load
  - Force activation of new service workers without user intervention
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 6. Update service worker manager for aggressive updates
  - Add `checkForUpdates()` method to force update checks
  - Implement `forceUpdate()` method for immediate activation
  - Add cache version management methods
  - _Requirements: 1.1, 1.2, 4.2_

- [x] 7. Create update notification component
  - Build a React component to display update availability notifications
  - Add "Update Now" button with loading states
  - Implement proper styling and positioning for mobile devices
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 8. Integrate update notifications into main app
  - Add the update notification component to the main app layout
  - Connect the component to service worker update events
  - Handle update activation and page reload logic
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 9. Update service worker hook for new functionality
  - Add new methods to `useServiceWorker` hook for update management
  - Implement state management for update availability and progress
  - Add error handling for update failures
  - _Requirements: 4.1, 4.2, 1.3_

- [x] 10. Add comprehensive error handling for update process
  - Implement fallback mechanisms for failed updates
  - Add retry logic with exponential backoff
  - Handle network failures gracefully while maintaining offline functionality
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 11. Write unit tests for service worker functionality
  - Create tests for cache strategy logic
  - Test cache versioning and cleanup mechanisms
  - Verify update detection and activation processes
  - _Requirements: 1.1, 3.1, 5.1_

- [x] 12. Write integration tests for update flow
  - Test end-to-end update process from detection to activation
  - Verify offline/online transition behavior
  - Test cache invalidation scenarios across different browsers
  - _Requirements: 1.3, 2.2, 2.3_