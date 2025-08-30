import { vi } from 'vitest';
import { ErrorLogger } from '../errorLogger';
import type { AppError, ErrorCode } from '../../types/errors';
import { createAppError } from '../../types/errors';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock navigator
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

describe('ErrorLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Clear any existing error logs
    ErrorLogger.clearErrorLogs();
    
    // Suppress console logs for cleaner test output
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logError', () => {
    it('logs an AppError with generated ID', () => {
      const error = createAppError(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        'Invalid credentials'
      );

      ErrorLogger.logError(error);

      const stats = ErrorLogger.getErrorStats();
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorsByCode[ErrorCode.AUTH_INVALID_CREDENTIALS]).toBe(1);
    });

    it('logs an AppError with custom ID', () => {
      const error = createAppError(
        ErrorCode.DB_NETWORK_ERROR,
        'Database connection failed'
      );
      const customId = 'custom-error-123';

      ErrorLogger.logError(error, customId);

      const stats = ErrorLogger.getErrorStats();
      expect(stats.recentErrors[0].errorId).toBe(customId);
    });

    it('stores errors in localStorage', () => {
      const error = createAppError(
        ErrorCode.STORAGE_FILE_TOO_LARGE,
        'File too large'
      );

      ErrorLogger.logError(error);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'error_logs',
        expect.any(String)
      );
    });
  });

  describe('logJSError', () => {
    it('converts JavaScript Error to AppError', () => {
      const jsError = new Error('JavaScript runtime error');
      jsError.stack = 'Error stack trace';

      ErrorLogger.logJSError(jsError, 'Component context');

      const stats = ErrorLogger.getErrorStats();
      expect(stats.totalErrors).toBe(1);
      expect(stats.recentErrors[0].error.message).toBe('JavaScript runtime error');
      expect(stats.recentErrors[0].error.details?.context).toBe('Component context');
    });
  });

  describe('logNetworkError', () => {
    it('logs network request failures', () => {
      ErrorLogger.logNetworkError('/api/plants', 'GET', 404, 'Not found');

      const stats = ErrorLogger.getErrorStats();
      expect(stats.totalErrors).toBe(1);
      expect(stats.recentErrors[0].error.code).toBe('network-error');
      expect(stats.recentErrors[0].error.details?.url).toBe('/api/plants');
      expect(stats.recentErrors[0].error.details?.method).toBe('GET');
      expect(stats.recentErrors[0].error.details?.status).toBe(404);
    });
  });

  describe('getErrorStats', () => {
    it('returns correct error statistics', () => {
      // Log multiple errors
      ErrorLogger.logError(createAppError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Auth error 1'));
      ErrorLogger.logError(createAppError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Auth error 2'));
      ErrorLogger.logError(createAppError(ErrorCode.DB_NETWORK_ERROR, 'DB error'));

      const stats = ErrorLogger.getErrorStats();
      
      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByCode[ErrorCode.AUTH_INVALID_CREDENTIALS]).toBe(2);
      expect(stats.errorsByCode[ErrorCode.DB_NETWORK_ERROR]).toBe(1);
      expect(stats.recentErrors).toHaveLength(3);
    });

    it('limits recent errors to last 10', () => {
      // Log 15 errors
      for (let i = 0; i < 15; i++) {
        ErrorLogger.logError(createAppError(ErrorCode.UNKNOWN_ERROR, `Error ${i}`));
      }

      const stats = ErrorLogger.getErrorStats();
      expect(stats.recentErrors).toHaveLength(10);
      expect(stats.recentErrors[9].error.message).toBe('Error 14');
    });
  });

  describe('clearErrorLogs', () => {
    it('clears all error logs', () => {
      ErrorLogger.logError(createAppError(ErrorCode.UNKNOWN_ERROR, 'Test error'));
      
      let stats = ErrorLogger.getErrorStats();
      expect(stats.totalErrors).toBe(1);

      ErrorLogger.clearErrorLogs();
      
      stats = ErrorLogger.getErrorStats();
      expect(stats.totalErrors).toBe(0);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('error_logs');
    });
  });

  describe('exportErrorLogs', () => {
    it('exports error logs as JSON string', () => {
      const error1 = createAppError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Auth error');
      const error2 = createAppError(ErrorCode.DB_NETWORK_ERROR, 'DB error');
      
      ErrorLogger.logError(error1);
      ErrorLogger.logError(error2);

      const exported = ErrorLogger.exportErrorLogs();
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].error.message).toBe('Auth error');
      expect(parsed[1].error.message).toBe('DB error');
    });
  });

  describe('localStorage error handling', () => {
    it('handles localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage full');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const error = createAppError(ErrorCode.UNKNOWN_ERROR, 'Test error');
      
      // Should not throw
      expect(() => ErrorLogger.logError(error)).not.toThrow();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to store error locally:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('handles localStorage retrieval errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const error = createAppError(ErrorCode.UNKNOWN_ERROR, 'Test error');
      
      // Should not throw
      expect(() => ErrorLogger.logError(error)).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });

  describe('memory management', () => {
    it('limits in-memory errors to 100', () => {
      // Log 150 errors
      for (let i = 0; i < 150; i++) {
        ErrorLogger.logError(createAppError(ErrorCode.UNKNOWN_ERROR, `Error ${i}`));
      }

      const stats = ErrorLogger.getErrorStats();
      expect(stats.totalErrors).toBe(100); // Should be capped at 100
    });
  });
});