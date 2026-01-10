import { vi } from 'vitest';

export const firebaseModuleMock = () => ({
  __esModule: true,
  default: {
    initializeApp: vi.fn(),
    getApp: vi.fn(),
    app: {},
  },
});
