import { vi } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';

// Initialize i18n for tests
import '../i18n';

// Set default timeout for all tests
vi.setConfig({ testTimeout: 15000 });



// Mock Firebase configuration
const mockFirebaseConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test-project.firebaseapp.com',
  projectId: 'test-project',
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
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback({
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      metadata: { creationTime: new Date().toISOString() }
    });
    return vi.fn();
  }),
  connectAuthEmulator: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => mockDb),
  collection: vi.fn(),
  doc: vi.fn((...args) => ({ id: args[args.length - 1], path: args.join('/') })),
  getDocs: vi.fn(() => Promise.resolve({
    forEach: () => { },
    docs: [],
    empty: true,
    size: 0
  })),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => false,
    data: () => ({}),
    id: 'mock-id'
  })),
  addDoc: vi.fn(() => Promise.resolve({ id: 'new-doc-id' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
  Timestamp: {
    fromDate: vi.fn((date) => ({
      toDate: () => date,
      toMillis: () => date.getTime(),
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: (date.getTime() % 1000) * 1e6,
    })),
    now: vi.fn(() => ({
      toDate: () => new Date(),
      toMillis: () => Date.now(),
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: (Date.now() % 1000) * 1e6,
    })),
  },
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => mockFunctions),
  httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: {} }))),
  connectFunctionsEmulator: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  uploadBytes: vi.fn(() => Promise.resolve({})),
  getDownloadURL: vi.fn(() => Promise.resolve('https://example.com/photo.jpg')),
  deleteObject: vi.fn(() => Promise.resolve()),
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(() => ({})),
  logEvent: vi.fn(),
}));

vi.mock('firebase/performance', () => ({
  getPerformance: vi.fn(() => ({})),
  trace: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    record: vi.fn(),
  })),
}));

// Mock Firebase configuration module
vi.mock('../config/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn((callback) => {
      callback({
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
      });
      return vi.fn();
    }),
    signOut: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
  },
  db: {
    collection: vi.fn(),
    doc: vi.fn(),
  },
  functions: {
    httpsCallable: vi.fn(),
  },
  default: {
    name: '[DEFAULT]',
    options: {},
  },
}));

// Mock environment variables
vi.mock('import.meta', () => ({
  env: {
    VITE_FIREBASE_API_KEY: 'test-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'test-project',
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

// Mock react-i18next to prevent NO_I18NEXT_INSTANCE errors
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const parts = key.split(':');
      const actualKey = parts.length > 1 ? parts[1] : parts[0];
      return actualKey
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
      isInitialized: true,
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock translation hooks and context
vi.mock('../hooks/useTranslation', () => {
  const t = (key: string) => {
    const parts = key.split(':');
    const actualKey = parts.length > 1 ? parts[1] : parts[0];
    return actualKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };
  return {
    useTranslation: () => ({
      t,
      tCommon: t,
      tNavigation: t,
      tAuth: t,
      tDashboard: t,
      tForms: t,
      tErrors: t,
      formatDate: (date: Date | string) => new Date(date).toLocaleDateString(),
      formatTime: (date: Date | string) => new Date(date).toLocaleTimeString(),
      language: 'en',
      changeLanguage: vi.fn(),
      isLoading: false,
      error: null,
      supportedLanguages: [
        { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
        { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
      ],
      currentLanguageConfig: { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
      isRTL: false,
    }),
    useCommonTranslation: () => t,
    useNavigationTranslation: () => t,
    useAuthTranslation: () => t,
    useDashboardTranslation: () => t,
    useFormsTranslation: () => t,
    useErrorsTranslation: () => t,
    default: () => ({
      t,
      formatDate: (date: Date | string) => new Date(date).toLocaleDateString(),
      formatTime: (date: Date | string) => new Date(date).toLocaleTimeString(),
    }),
  };
});

vi.mock('../services/authService', () => ({
  AuthService: {
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    resetPassword: vi.fn(),
    getCurrentUser: vi.fn(),
    onAuthStateChanged: vi.fn((callback) => {
      callback({
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        createdAt: new Date(),
      });
      return vi.fn();
    }),
    validateEmail: vi.fn(() => true),
    validatePassword: vi.fn(() => ({ isValid: true })),
  },
}));

vi.mock('../contexts/I18nContext', () => ({
  useI18nContext: () => ({
    language: 'en',
    changeLanguage: vi.fn(),
    t: (key: string) => key,
    isLoading: false,
    error: null,
    supportedLanguages: [
      { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
      { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
    ],
    currentLanguageConfig: { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    recoverFromError: vi.fn(),
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../services/firebaseInit', () => ({
  FirebaseInitService: {
    initialize: vi.fn().mockResolvedValue(undefined),
    validateConfiguration: vi.fn(() => true),
    isInitialized: vi.fn(() => true),
    isEmulatorMode: vi.fn(() => false),
  },
  FirebaseErrorHandler: {
    getErrorMessage: vi.fn((error) => error.message || 'An error occurred'),
    logError: vi.fn(),
  },
}));

vi.mock('../components/debug/FirebaseDebug', () => ({
  FirebaseDebug: () => null,
}));

vi.mock('../utils/serviceWorkerManager', () => ({
  serviceWorkerManager: {
    isSupported: vi.fn(() => true),
    register: vi.fn().mockResolvedValue({}),
    unregister: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue(undefined),
    isOnline: vi.fn(() => true),
    onOnlineStatusChange: vi.fn(() => vi.fn()),
    requestBackgroundSync: vi.fn().mockResolvedValue(undefined),
    cacheUrls: vi.fn().mockResolvedValue(true),
    clearCache: vi.fn().mockResolvedValue(true),
    checkForUpdates: vi.fn().mockResolvedValue(false),
    forceUpdate: vi.fn().mockResolvedValue(undefined),
    getCurrentCacheVersion: vi.fn().mockResolvedValue('1.0.0'),
    clearOldCaches: vi.fn().mockResolvedValue(true),
    retryUpdate: vi.fn().mockResolvedValue(undefined),
    recoverFromFailedUpdate: vi.fn().mockResolvedValue(true),
    validateServiceWorkerHealth: vi.fn().mockResolvedValue(true),
    getUpdateErrorHistory: vi.fn(() => []),
    clearUpdateErrorHistory: vi.fn(),
  },
}));

const mockPlant = {
  id: 'mock-plant-1',
  userId: 'test-user-123',
  name: 'Mock Monstera',
  species: 'Monstera Deliciosa',
  description: 'A beautiful mock plant',
  photos: [{ id: 'photo-1', url: 'https://example.com/photo.jpg', uploadedAt: new Date() }],
  careTasks: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock('../services/plantService', () => {
  const mockPlantService = {
    getUserPlants: vi.fn().mockResolvedValue([mockPlant]),
    getPlant: vi.fn().mockResolvedValue(mockPlant),
    createPlant: vi.fn().mockResolvedValue('mock-plant-id'),
    updatePlant: vi.fn().mockResolvedValue(undefined),
    deletePlant: vi.fn().mockResolvedValue(undefined),
    validatePlantData: vi.fn().mockReturnValue({ isValid: true, errors: [] }),
    addCareTaskToPlant: vi.fn().mockResolvedValue('mock-task-id'),
    addPhotoToPlant: vi.fn().mockResolvedValue({}),
  };
  return {
    PlantService: mockPlantService,
    default: mockPlantService,
  };
});

vi.mock('../services/offlineAwarePlantService', () => {
  const mockOfflineService = {
    getUserPlants: vi.fn().mockResolvedValue([]),
    getPlant: vi.fn().mockResolvedValue(null),
    createPlant: vi.fn().mockResolvedValue('mock-plant-id'),
    updatePlant: vi.fn().mockResolvedValue(undefined),
    deletePlant: vi.fn().mockResolvedValue(undefined),
    uploadPlantPhoto: vi.fn().mockResolvedValue({}),
    addCareTask: vi.fn().mockResolvedValue({}),
  };
  return {
    OfflineAwarePlantService: mockOfflineService,
    default: mockOfflineService,
  };
});

vi.mock('../services/projectService', () => ({
  getUserProjects: vi.fn().mockResolvedValue([]),
  getProject: vi.fn().mockResolvedValue(null),
  createProject: vi.fn().mockResolvedValue('mock-project-id'),
  updateProject: vi.fn().mockResolvedValue(undefined),
  deleteProject: vi.fn().mockResolvedValue(undefined),
  createSubtask: vi.fn().mockResolvedValue('mock-subtask-id'),
  updateSubtask: vi.fn().mockResolvedValue(undefined),
  deleteSubtask: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/simpleTaskService', () => {
  const mockTasks = {
    getUserSimpleTasks: vi.fn().mockResolvedValue([]),
    getSimpleTask: vi.fn().mockResolvedValue(null),
    createSimpleTask: vi.fn().mockResolvedValue('mock-task-id'),
    updateSimpleTask: vi.fn().mockResolvedValue(undefined),
    deleteSimpleTask: vi.fn().mockResolvedValue(undefined),
    sortTasksByDueDate: vi.fn((tasks) => tasks),
    filterTasksByCompletion: vi.fn((tasks) => tasks),
    searchTasks: vi.fn((tasks) => tasks),
    toggleTaskCompletion: vi.fn().mockResolvedValue(undefined),
    completeTask: vi.fn().mockResolvedValue(undefined),
    uncompleteTask: vi.fn().mockResolvedValue(undefined),
  };
  return {
    ...mockTasks,
    SimpleTaskService: mockTasks,
    default: mockTasks,
  };
});

vi.mock('../services/calendarService', () => ({
  getUpcomingEvents: vi.fn().mockResolvedValue([]),
  getEventsForDateRange: vi.fn().mockResolvedValue([]),
  getEventsForDate: vi.fn().mockResolvedValue([]),
  getOverdueEvents: vi.fn().mockResolvedValue([]),
  getTodaysEvents: vi.fn().mockResolvedValue([]),
  getThisWeeksEvents: vi.fn().mockResolvedValue([]),
  getThisMonthsEvents: vi.fn().mockResolvedValue([]),
  createEvent: vi.fn().mockResolvedValue({}),
  updateEvent: vi.fn().mockResolvedValue(undefined),
  deleteEvent: vi.fn().mockResolvedValue(undefined),
  syncAllToCalendar: vi.fn().mockResolvedValue(undefined),
}));

