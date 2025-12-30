import React from 'react';

/**
 * Performance monitoring utilities
 */

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private observers: PerformanceObserver[] = [];

  /**
   * Start timing a performance metric
   */
  startTiming(name: string, metadata?: Record<string, any>): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    });
  }

  /**
   * End timing a performance metric
   */
  endTiming(name: string): PerformanceMetric | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration
    };

    this.metrics.set(name, completedMetric);
    return completedMetric;
  }

  /**
   * Get a performance metric
   */
  getMetric(name: string): PerformanceMetric | null {
    return this.metrics.get(name) || null;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Monitor Core Web Vitals
   */
  monitorWebVitals(): void {
    // Monitor Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          console.log('LCP:', lastEntry.startTime);
          this.logMetric('LCP', lastEntry.startTime);
        });

        try {
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          this.observers.push(lcpObserver);
        } catch (e) {
          console.warn('LCP observer not supported');
        }
      } catch (e) {
        console.warn('PerformanceObserver not supported for LCP');
      }

      // Monitor First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            console.log('FID:', entry.processingStart - entry.startTime);
            this.logMetric('FID', entry.processingStart - entry.startTime);
          });
        });

        try {
          fidObserver.observe({ entryTypes: ['first-input'] });
          this.observers.push(fidObserver);
        } catch (e) {
          console.warn('FID observer not supported');
        }
      } catch (e) {
        console.warn('PerformanceObserver not supported for FID');
      }

      // Monitor Cumulative Layout Shift (CLS)
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });

          console.log('CLS:', clsValue);
          this.logMetric('CLS', clsValue);
        });

        try {
          clsObserver.observe({ entryTypes: ['layout-shift'] });
          this.observers.push(clsObserver);
        } catch (e) {
          console.warn('CLS observer not supported');
        }
      } catch (e) {
        console.warn('PerformanceObserver not supported for CLS');
      }
    }
  }

  /**
   * Monitor resource loading times
   */
  monitorResourceLoading(): void {
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            console.log(`Resource ${resourceEntry.name}: ${resourceEntry.duration}ms`);
            
            this.logMetric(`resource-${resourceEntry.name}`, resourceEntry.duration, {
              type: resourceEntry.initiatorType,
              size: resourceEntry.transferSize
            });
          }
        });
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (e) {
        console.warn('Resource observer not supported');
      }
    }
  }

  /**
   * Log a metric with timestamp
   */
  private logMetric(name: string, value: number, metadata?: Record<string, any>): void {
    this.metrics.set(`${name}-${Date.now()}`, {
      name,
      startTime: performance.now(),
      endTime: performance.now(),
      duration: value,
      metadata
    });
  }

  /**
   * Cleanup observers
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Higher-order component for measuring component render time
 */
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceMonitoredComponent(props: P) {
    React.useEffect(() => {
      performanceMonitor.startTiming(`${componentName}-render`);
      
      return () => {
        performanceMonitor.endTiming(`${componentName}-render`);
      };
    });

    return React.createElement(WrappedComponent, props);
  };
}

/**
 * Hook for measuring function execution time
 */
export function usePerformanceTimer(name: string) {
  const startTimer = React.useCallback(() => {
    performanceMonitor.startTiming(name);
  }, [name]);

  const endTimer = React.useCallback(() => {
    return performanceMonitor.endTiming(name);
  }, [name]);

  return { startTimer, endTimer };
}

/**
 * Measure async function execution time
 */
export async function measureAsync<T>(
  name: string,
  asyncFn: () => Promise<T>
): Promise<T> {
  performanceMonitor.startTiming(name);
  try {
    const result = await asyncFn();
    performanceMonitor.endTiming(name);
    return result;
  } catch (error) {
    performanceMonitor.endTiming(name);
    throw error;
  }
}

// Initialize monitoring on module load
if (typeof window !== 'undefined') {
  performanceMonitor.monitorWebVitals();
  performanceMonitor.monitorResourceLoading();
}