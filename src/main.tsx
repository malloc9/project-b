import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { FirebaseInitService } from './services/firebaseInit'
import './i18n'

// Initialize Firebase with emulators in development
const initializeFirebase = async () => {
  try {
    // Temporarily disable emulators to avoid connection issues
    const useEmulators = false; // import.meta.env.DEV;
    await FirebaseInitService.initialize(useEmulators);
    
    console.log('🔥 Firebase Configuration Check:', {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '❌ Missing',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '❌ Missing',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '❌ Missing',
      emulators: useEmulators ? '✅ Enabled' : '❌ Disabled',
    });
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
};

// Initialize Firebase before rendering
initializeFirebase();

// Render the app
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
