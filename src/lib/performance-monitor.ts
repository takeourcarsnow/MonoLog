// Performance monitoring utilities
// Tracks Core Web Vitals and other performance metrics

import React from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  id?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initObservers();
  }

  private initObservers() {
    // Observe Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.recordMetric('LCP', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);

        // Observe First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.recordMetric('FID', entry.processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);

        // Observe Cumulative Layout Shift (CLS)
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.recordMetric('CLS', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);

      } catch (e) {
        console.warn('Performance monitoring not fully supported:', e);
      }
    }
  }

  recordMetric(name: string, value: number, id?: string) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      id
    };

    this.metrics.push(metric);

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Log to console in development (removed)
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  getLatestMetric(name: string): PerformanceMetric | null {
    const metrics = this.getMetrics(name);
    return metrics.length > 0 ? metrics[metrics.length - 1] : null;
  }

  // Utility to measure function execution time
  measureExecutionTime<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    this.recordMetric(`${name}_execution_time`, end - start);
    return result;
  }

  // Utility to measure async function execution time
  async measureAsyncExecutionTime<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    this.recordMetric(`${name}_execution_time`, end - start);
    return result;
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

// React hook for performance monitoring
export function usePerformanceMonitor() {
  return getPerformanceMonitor();
}

// Utility hook to measure component render time
export function useRenderTimeTracker(componentName: string) {
  const monitor = getPerformanceMonitor();

  React.useEffect(() => {
    const start = performance.now();

    return () => {
      const end = performance.now();
      monitor.recordMetric(`${componentName}_render_time`, end - start);
    };
  }, [componentName, monitor]);
}

// Export for direct usage
export { PerformanceMonitor };
export type { PerformanceMetric };