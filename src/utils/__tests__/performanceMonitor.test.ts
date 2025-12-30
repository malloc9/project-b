import { vi, describe, it, expect, beforeEach } from 'vitest';
import { performanceMonitor, measureAsync, usePerformanceTimer } from '../performanceMonitor';
import { renderHook } from '@testing-library/react';

// Mock performance API
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: vi.fn(() => 1000),
    mark: vi.fn(),
    measure: vi.fn(),
  },
});

// Mock PerformanceObserver
Object.defineProperty(global, 'PerformanceObserver', {
  writable: true,
  value: vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
  })),
});

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    performanceMonitor.clearMetrics();
    vi.clearAllMocks();
  });

  describe('timing operations', () => {
    it('starts and ends timing correctly', () => {
      performanceMonitor.startTiming('test-operation');
      
      // Mock time progression
      vi.mocked(performance.now).mockReturnValue(1500);
      
      const metric = performanceMonitor.endTiming('test-operation');
      
      expect(metric).toEqual({
        name: 'test-operation',
        startTime: 1000,
        endTime: 1500,
        duration: 500,
      });
    });

    it('handles timing with metadata', () => {
      const metadata = { component: 'TestComponent', props: { id: 1 } };
      
      performanceMonitor.startTiming('test-with-metadata', metadata);
      vi.mocked(performance.now).mockReturnValue(1200);
      
      const metric = performanceMonitor.endTiming('test-with-metadata');
      
      expect(metric?.metadata).toEqual(metadata);
    });

    it('returns null for non-existent timing', () => {
      const metric = performanceMonitor.endTiming('non-existent');
      expect(metric).toBeNull();
    });

    it('warns for non-existent timing', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      performanceMonitor.endTiming('non-existent');
      
      expect(consoleSpy).toHaveBeenCalledWith('Performance metric "non-existent" not found');
      consoleSpy.mockRestore();
    });
  });

  describe('metric management', () => {
    it('retrieves metrics correctly', () => {
      // Set up the timing sequence
      vi.mocked(performance.now).mockReturnValueOnce(1000); // start time
      performanceMonitor.startTiming('test-metric');
      
      vi.mocked(performance.now).mockReturnValueOnce(1100); // end time
      performanceMonitor.endTiming('test-metric');
      
      const metric = performanceMonitor.getMetric('test-metric');
      expect(metric?.name).toBe('test-metric');
      expect(metric?.duration).toBe(100);
    });

    it('returns all metrics', () => {
      performanceMonitor.startTiming('metric1');
      performanceMonitor.startTiming('metric2');
      
      const allMetrics = performanceMonitor.getAllMetrics();
      expect(allMetrics).toHaveLength(2);
      expect(allMetrics.map(m => m.name)).toContain('metric1');
      expect(allMetrics.map(m => m.name)).toContain('metric2');
    });

    it('clears all metrics', () => {
      performanceMonitor.startTiming('metric1');
      performanceMonitor.startTiming('metric2');
      
      performanceMonitor.clearMetrics();
      
      expect(performanceMonitor.getAllMetrics()).toHaveLength(0);
    });
  });

  describe('web vitals monitoring', () => {
    it('sets up performance observers', () => {
      performanceMonitor.monitorWebVitals();
      
      // Should create observers for LCP, FID, and CLS
      expect(PerformanceObserver).toHaveBeenCalledTimes(3);
    });

    it('handles observer creation errors gracefully', () => {
      const mockObserver = vi.fn(() => {
        throw new Error('Observer not supported');
      });
      Object.defineProperty(global, 'PerformanceObserver', {
        value: mockObserver,
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(() => performanceMonitor.monitorWebVitals()).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('disconnects all observers', () => {
      const mockDisconnect = vi.fn();
      const mockObserver = vi.fn(() => ({
        observe: vi.fn(),
        disconnect: mockDisconnect,
      }));
      
      Object.defineProperty(global, 'PerformanceObserver', {
        value: mockObserver,
      });

      performanceMonitor.monitorWebVitals();
      performanceMonitor.cleanup();
      
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });
});

describe('measureAsync', () => {
  it('measures async function execution time', async () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    
    vi.mocked(performance.now)
      .mockReturnValueOnce(1000) // start time
      .mockReturnValueOnce(1500); // end time
    
    const result = await measureAsync('async-test', asyncFn);
    
    expect(result).toBe('result');
    expect(asyncFn).toHaveBeenCalled();
    
    const metric = performanceMonitor.getMetric('async-test');
    expect(metric?.duration).toBe(500);
  });

  it('handles async function errors', async () => {
    const error = new Error('Async error');
    const asyncFn = vi.fn().mockRejectedValue(error);
    
    await expect(measureAsync('async-error', asyncFn)).rejects.toThrow('Async error');
    
    // Should still record timing even on error
    const metric = performanceMonitor.getMetric('async-error');
    expect(metric).toBeTruthy();
  });
});

describe('usePerformanceTimer', () => {
  it('provides start and end timer functions', () => {
    const { result } = renderHook(() => usePerformanceTimer('hook-test'));
    
    expect(typeof result.current.startTimer).toBe('function');
    expect(typeof result.current.endTimer).toBe('function');
  });

  it('starts and ends timing when called', () => {
    const { result } = renderHook(() => usePerformanceTimer('hook-timing'));
    
    // Set up timing sequence
    vi.mocked(performance.now).mockReturnValueOnce(1000); // start time
    result.current.startTimer();
    
    vi.mocked(performance.now).mockReturnValueOnce(1300); // end time
    const metric = result.current.endTimer();
    
    expect(metric?.name).toBe('hook-timing');
    expect(metric?.duration).toBe(300);
  });
});