import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseCalendarError,
  retryCalendarOperation,
  executeCalendarOperation,
  CalendarOperationQueue,
} from '../calendarErrorHandler';
import { ErrorCode } from '../../types';

describe('CalendarErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('parseCalendarError', () => {
    it('should parse Firebase Functions authentication error', () => {
      const error = { code: 'functions/unauthenticated', message: 'Not authenticated' };
      const result = parseCalendarError(error);
      
      expect(result.code).toBe(ErrorCode.CALENDAR_AUTH_ERROR);
      expect(result.retryable).toBe(false);
    });

    it('should parse Firebase Functions quota exceeded error', () => {
      const error = { code: 'functions/resource-exhausted', message: 'Quota exceeded' };
      const result = parseCalendarError(error);
      
      expect(result.code).toBe(ErrorCode.CALENDAR_QUOTA_EXCEEDED);
      expect(result.retryable).toBe(true);
      expect(result.retryAfter).toBe(3600);
    });

    it('should parse Google Calendar API 401 error', () => {
      const error = { status: 401, message: 'Unauthorized' };
      const result = parseCalendarError(error);
      
      expect(result.code).toBe(ErrorCode.CALENDAR_AUTH_ERROR);
      expect(result.retryable).toBe(false);
    });

    it('should parse Google Calendar API 429 error with retry-after header', () => {
      const error = { 
        status: 429, 
        message: 'Too many requests',
        headers: { 'retry-after': '120' }
      };
      const result = parseCalendarError(error);
      
      expect(result.code).toBe(ErrorCode.CALENDAR_QUOTA_EXCEEDED);
      expect(result.retryable).toBe(true);
      expect(result.retryAfter).toBe(120);
    });

    it('should parse network error', () => {
      const error = { name: 'NetworkError', message: 'Network failed' };
      const result = parseCalendarError(error);
      
      expect(result.code).toBe(ErrorCode.CALENDAR_NETWORK_ERROR);
      expect(result.retryable).toBe(true);
    });

    it('should parse unknown error as retryable network error', () => {
      const error = { message: 'Unknown error' };
      const result = parseCalendarError(error);
      
      expect(result.code).toBe(ErrorCode.CALENDAR_NETWORK_ERROR);
      expect(result.retryable).toBe(true);
    });
  });

  describe('retryCalendarOperation', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await retryCalendarOperation(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error and eventually succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce({ status: 500, message: 'Server error' })
        .mockRejectedValueOnce({ status: 500, message: 'Server error' })
        .mockResolvedValue('success');
      
      const promise = retryCalendarOperation(operation, { maxRetries: 3, baseDelay: 100 });
      
      // Fast-forward timers to simulate delays
      vi.advanceTimersByTime(100);
      await Promise.resolve(); // Allow first retry
      vi.advanceTimersByTime(200);
      await Promise.resolve(); // Allow second retry
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable error', async () => {
      const operation = vi.fn().mockRejectedValue({ 
        code: 'functions/unauthenticated', 
        message: 'Not authenticated' 
      });
      
      await expect(retryCalendarOperation(operation)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and throw last error', async () => {
      const operation = vi.fn().mockRejectedValue({ 
        status: 500, 
        message: 'Server error' 
      });
      
      const promise = retryCalendarOperation(operation, { maxRetries: 2, baseDelay: 100 });
      
      // Fast-forward through all retries
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      vi.advanceTimersByTime(200);
      await Promise.resolve();
      
      await expect(promise).rejects.toThrow('Server error');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('executeCalendarOperation', () => {
    it('should return result on success', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await executeCalendarOperation(operation, 'test-operation');
      
      expect(result).toBe('success');
    });

    it('should return null for network errors', async () => {
      const operation = vi.fn().mockRejectedValue({ 
        status: 500, 
        message: 'Server error' 
      });
      
      const result = await executeCalendarOperation(operation, 'test-operation');
      
      expect(result).toBeNull();
    });

    it('should throw for auth errors', async () => {
      const operation = vi.fn().mockRejectedValue({ 
        code: 'functions/unauthenticated', 
        message: 'Not authenticated' 
      });
      
      await expect(executeCalendarOperation(operation, 'test-operation')).rejects.toThrow();
    });
  });

  describe('CalendarOperationQueue', () => {
    let queue: CalendarOperationQueue;

    beforeEach(() => {
      queue = new CalendarOperationQueue(1000); // 1 second interval for testing
    });

    afterEach(() => {
      queue.stopProcessing();
    });

    it('should enqueue and process operations', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      queue.enqueue('test-op', operation);
      
      expect(queue.getStatus().pending).toBe(1);
      
      // Fast-forward to trigger processing
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      
      expect(operation).toHaveBeenCalled();
      expect(queue.getStatus().pending).toBe(0);
    });

    it('should retry failed operations', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce({ status: 500, message: 'Server error' })
        .mockResolvedValue('success');
      
      queue.enqueue('test-op', operation, 2);
      
      // First attempt fails
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      
      expect(queue.getStatus().pending).toBe(1); // Still pending
      
      // Second attempt succeeds
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      
      expect(operation).toHaveBeenCalledTimes(2);
      expect(queue.getStatus().pending).toBe(0);
    });

    it('should remove operations after max retries', async () => {
      const operation = vi.fn().mockRejectedValue({ 
        status: 500, 
        message: 'Server error' 
      });
      
      queue.enqueue('test-op', operation, 1);
      
      // First attempt fails
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      
      // Second attempt fails (max retries reached)
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      
      expect(operation).toHaveBeenCalledTimes(2);
      expect(queue.getStatus().pending).toBe(0); // Removed from queue
    });

    it('should replace existing operation with same ID', () => {
      const operation1 = vi.fn().mockResolvedValue('success1');
      const operation2 = vi.fn().mockResolvedValue('success2');
      
      queue.enqueue('test-op', operation1);
      queue.enqueue('test-op', operation2); // Should replace operation1
      
      expect(queue.getStatus().pending).toBe(1);
    });

    it('should allow manual dequeue', () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      queue.enqueue('test-op', operation);
      expect(queue.getStatus().pending).toBe(1);
      
      queue.dequeue('test-op');
      expect(queue.getStatus().pending).toBe(0);
    });
  });
});