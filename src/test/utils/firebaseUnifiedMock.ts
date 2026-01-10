import { vi } from 'vitest';

export const firebaseUnifiedModule = () => ({
  __esModule: true,
  default: {
    initializeApp: vi.fn(),
    getApp: vi.fn(),
    app: {},
  },
});
