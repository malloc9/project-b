import { vi } from 'vitest';

// Mock Firebase configuration
const mockFirebaseConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test-project.firebaseapp.com',
  projectId: 'test-project',
  storageBucket: 'test-project.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abcdef123456',
};

// Mock Firebase app
const mockApp = {
  name: '[DEFAULT]',
  options: mockFirebaseConfig,
};

// Mock Firebase services
const mockAuth = {
  currentUser: null,
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
};

const mockDb = {
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
};

const mockStorage = {
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
};

const mockFunctions = {
  httpsCallable: vi.fn(),
};

// Mock Firebase modules
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => mockApp),
  getApp: vi.fn(() => mockApp),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => mockAuth),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => mockDb),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => mockStorage),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => mockFunctions),
  httpsCallable: vi.fn(() => vi.fn()),
}));

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_FIREBASE_API_KEY: 'test-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'test-project',
    VITE_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
    VITE_FIREBASE_APP_ID: '1:123456789:web:abcdef123456',
  },
}));

// Mock ResizeObserver for responsive design tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver for lazy loading tests
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock types and enums
vi.mock('../types', () => ({
  ErrorCode: {
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
    AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
    AUTH_USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
    AUTH_WRONG_PASSWORD: 'AUTH_WRONG_PASSWORD',
    AUTH_EMAIL_ALREADY_IN_USE: 'AUTH_EMAIL_ALREADY_IN_USE',
    AUTH_WEAK_PASSWORD: 'AUTH_WEAK_PASSWORD',
    AUTH_NETWORK_ERROR: 'AUTH_NETWORK_ERROR',
    AUTH_TOO_MANY_REQUESTS: 'AUTH_TOO_MANY_REQUESTS',
    DB_PERMISSION_DENIED: 'DB_PERMISSION_DENIED',
    DB_NOT_FOUND: 'DB_NOT_FOUND',
    DB_NETWORK_ERROR: 'DB_NETWORK_ERROR',
    DB_QUOTA_EXCEEDED: 'DB_QUOTA_EXCEEDED',
    DB_VALIDATION_ERROR: 'DB_VALIDATION_ERROR',
    STORAGE_UNAUTHORIZED: 'STORAGE_UNAUTHORIZED',
    STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
    STORAGE_INVALID_FORMAT: 'STORAGE_INVALID_FORMAT',
    STORAGE_FILE_TOO_LARGE: 'STORAGE_FILE_TOO_LARGE',
    STORAGE_NETWORK_ERROR: 'STORAGE_NETWORK_ERROR',
    CALENDAR_AUTH_ERROR: 'CALENDAR_AUTH_ERROR',
    CALENDAR_QUOTA_EXCEEDED: 'CALENDAR_QUOTA_EXCEEDED',
    CALENDAR_NETWORK_ERROR: 'CALENDAR_NETWORK_ERROR',
    CALENDAR_INVALID_EVENT: 'CALENDAR_INVALID_EVENT',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
  },
}));

// Mock error utilities
vi.mock('../types/errors', () => ({
  ErrorCode: {
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
    AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
    AUTH_USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
    AUTH_WRONG_PASSWORD: 'AUTH_WRONG_PASSWORD',
    AUTH_EMAIL_ALREADY_IN_USE: 'AUTH_EMAIL_ALREADY_IN_USE',
    AUTH_WEAK_PASSWORD: 'AUTH_WEAK_PASSWORD',
    AUTH_NETWORK_ERROR: 'AUTH_NETWORK_ERROR',
    AUTH_TOO_MANY_REQUESTS: 'AUTH_TOO_MANY_REQUESTS',
    DB_PERMISSION_DENIED: 'DB_PERMISSION_DENIED',
    DB_NOT_FOUND: 'DB_NOT_FOUND',
    DB_NETWORK_ERROR: 'DB_NETWORK_ERROR',
    DB_QUOTA_EXCEEDED: 'DB_QUOTA_EXCEEDED',
    DB_VALIDATION_ERROR: 'DB_VALIDATION_ERROR',
    STORAGE_UNAUTHORIZED: 'STORAGE_UNAUTHORIZED',
    STORAGE_QUOTA_EXCEEDED: 'STORAGE_QUOTA_EXCEEDED',
    STORAGE_INVALID_FORMAT: 'STORAGE_INVALID_FORMAT',
    STORAGE_FILE_TOO_LARGE: 'STORAGE_FILE_TOO_LARGE',
    STORAGE_NETWORK_ERROR: 'STORAGE_NETWORK_ERROR',
    CALENDAR_AUTH_ERROR: 'CALENDAR_AUTH_ERROR',
    CALENDAR_QUOTA_EXCEEDED: 'CALENDAR_QUOTA_EXCEEDED',
    CALENDAR_NETWORK_ERROR: 'CALENDAR_NETWORK_ERROR',
    CALENDAR_INVALID_EVENT: 'CALENDAR_INVALID_EVENT',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
  },
  createAppError: vi.fn((code, message, details, userId) => ({
    code,
    message,
    details,
    timestamp: new Date(),
    userId,
  })),
  handleFirebaseError: vi.fn((error) => ({
    code: 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected error occurred',
    timestamp: new Date(),
  })),
  getErrorMessage: vi.fn((error) => error.message || 'An unexpected error occurred'),
}));