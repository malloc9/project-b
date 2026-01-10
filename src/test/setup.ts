import { vi } from 'vitest';
import './mocks/plantServiceInitializer';
import '../i18n';
import './setup-providers';
import '@testing-library/jest-dom';

// Mock Firebase Config to prevent real initialization
vi.mock('../config/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(() => vi.fn()),
    signOut: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
  },
  db: {
    type: 'firestore',
  },
  functions: {},
  storage: {},
  default: {
    name: 'mock-app',
    options: {},
    automaticDataCollectionEnabled: false,
  },
}));
