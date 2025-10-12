import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import crypto from 'crypto'

// Custom Vite plugin for service worker cache busting
function serviceWorkerCacheBusting(): Plugin {
  let buildHash: string;
  
  return {
    name: 'sw-cache-busting',
    configResolved() {
      // Generate a unique build hash based on current timestamp and random data
      const timestamp = Date.now().toString();
      const random = crypto.randomBytes(8).toString('hex');
      buildHash = crypto.createHash('md5').update(timestamp + random).digest('hex').substring(0, 8);
      console.log(`Service Worker Cache Busting: Generated build hash ${buildHash}`);
    },
    generateBundle(_options, _bundle) {
      // Copy service worker from public to dist during build
      const publicSwPath = resolve('public/sw.js');
      
      try {
        let swContent = readFileSync(publicSwPath, 'utf-8');
        
        if (swContent.includes('__BUILD_HASH__')) {
          // Replace the placeholder with the actual build hash
          swContent = swContent.replace(/__BUILD_HASH__/g, buildHash);
          console.log(`Service Worker Cache Busting: Replaced __BUILD_HASH__ with ${buildHash}`);
        } else {
          console.log(`Service Worker Cache Busting: No __BUILD_HASH__ placeholder found in sw.js`);
        }
        
        // Add the processed service worker to the bundle
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: swContent
        });
        
      } catch (error) {
        console.error('Service Worker Cache Busting: Failed to process sw.js', error);
      }
    },
    configureServer(server) {
      // Configure development server to serve service worker with no-cache headers
      server.middlewares.use('/sw.js', (_req, res, next) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Service-Worker-Allowed', '/');
        next();
      });
    },
    configurePreviewServer(server) {
      // Configure preview server to serve service worker with no-cache headers
      server.middlewares.use('/sw.js', (_req, res, next) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Service-Worker-Allowed', '/');
        next();
      });
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    serviceWorkerCacheBusting()
  ],
  build: {
    rollupOptions: {
      output: {
        // Configure asset naming for cache invalidation
        assetFileNames: (assetInfo) => {
          // Service worker should not be cached by browser - no hash in filename
          if (assetInfo.name === 'sw.js') {
            return 'sw.js';
          }
          // All other assets get hash for cache busting
          return 'assets/[name]-[hash][extname]';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js'
      }
    },
    // Ensure proper source maps for debugging
    sourcemap: true
  },
  // Configure server headers for development
  server: {
    headers: {
      // Prevent service worker caching during development
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  },
  // Configure preview server headers
  preview: {
    headers: {
      // Service worker should not be cached
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }
})
