/**
 * Performance monitoring utilities for tracking and analyzing app performance
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'timing' | 'count' | 'gauge';
  tags?: Record<string, string>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics

  /**
   * Record a timing metric (in milliseconds)
   */
  timing(name: string, value: number, tags?: Record<string, string>) {
    this.addMetric({
      name,
      value,
      timestamp: Date.now(),
      type: 'timing',
      tags,
    });
  }

  /**
   * Record a count metric
   */
  count(name: string, value: number = 1, tags?: Record<string, string>) {
    this.addMetric({
      name,
      value,
      timestamp: Date.now(),
      type: 'count',
      tags,
    });
  }

  /**
   * Record a gauge metric (snapshot value)
   */
  gauge(name: string, value: number, tags?: Record<string, string>) {
    this.addMetric({
      name,
      value,
      timestamp: Date.now(),
      type: 'gauge',
      tags,
    });
  }

  /**
   * Time a function execution
   */
  async timeAsync<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      this.timing(name, duration, tags);
    }
  }

  /**
   * Time a synchronous function
   */
  timeSync<T>(name: string, fn: () => T, tags?: Record<string, string>): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      this.timing(name, duration, tags);
    }
  }

  private addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log slow operations in development
    if (process.env.NODE_ENV !== 'production' && metric.type === 'timing' && metric.value > 1000) {
      console.warn(`[Performance] Slow operation detected: ${metric.name} took ${metric.value.toFixed(2)}ms`, metric.tags);
    }
  }

  /**
   * Get metrics by name
   */
  getMetrics(name?: string): PerformanceMetric[] {
    if (!name) return this.metrics;
    return this.metrics.filter(m => m.name === name);
  }

  /**
   * Get average timing for a metric
   */
  getAverageTiming(name: string): number {
    const timings = this.metrics.filter(m => m.name === name && m.type === 'timing');
    if (timings.length === 0) return 0;
    const sum = timings.reduce((acc, m) => acc + m.value, 0);
    return sum / timings.length;
  }

  /**
   * Get percentile timing for a metric
   */
  getPercentileTiming(name: string, percentile: number): number {
    const timings = this.metrics
      .filter(m => m.name === name && m.type === 'timing')
      .map(m => m.value)
      .sort((a, b) => a - b);
    
    if (timings.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * timings.length) - 1;
    return timings[index];
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const timingMetrics = new Map<string, number[]>();
    const countMetrics = new Map<string, number>();
    
    for (const metric of this.metrics) {
      if (metric.type === 'timing') {
        if (!timingMetrics.has(metric.name)) {
          timingMetrics.set(metric.name, []);
        }
        timingMetrics.get(metric.name)!.push(metric.value);
      } else if (metric.type === 'count') {
        const current = countMetrics.get(metric.name) || 0;
        countMetrics.set(metric.name, current + metric.value);
      }
    }

    const summary: any = {
      timings: {},
      counts: Object.fromEntries(countMetrics),
    };

    for (const [name, values] of timingMetrics.entries()) {
      const sorted = values.sort((a, b) => a - b);
      const sum = sorted.reduce((acc, v) => acc + v, 0);
      
      summary.timings[name] = {
        count: sorted.length,
        avg: sum / sorted.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      };
    }

    return summary;
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    return JSON.stringify({
      metrics: this.metrics,
      summary: this.getSummary(),
      timestamp: Date.now(),
    }, null, 2);
  }
}

// Singleton instance
export const perfMonitor = new PerformanceMonitor();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).__PERF_MONITOR__ = perfMonitor;
}

// Auto-track key web vitals
if (typeof window !== 'undefined') {
  // Track navigation timing
  window.addEventListener('load', () => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (nav) {
      perfMonitor.timing('page.domContentLoaded', nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart);
      perfMonitor.timing('page.load', nav.loadEventEnd - nav.loadEventStart);
      perfMonitor.timing('page.domInteractive', nav.domInteractive - nav.fetchStart);
    }
  });

  // Track resource timing for images. Store the observer on window so HMR
  // won't create multiple observers.
  try {
    const key = '__MONOLOG_PERF_RESOURCE_OBSERVER__';
    if (!(window as any)[key]) {
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resource = entry as PerformanceResourceTiming;
            if (resource.initiatorType === 'img') {
              perfMonitor.timing('resource.image', resource.duration, {
                url: resource.name.split('/').pop() || 'unknown',
              });
            }
          }
        }
      });
      obs.observe({ entryTypes: ['resource'] });
      (window as any)[key] = obs;

      // Cleanup when unloading the page
      window.addEventListener('beforeunload', () => {
        try { (window as any)[key].disconnect(); } catch (_) {}
        try { (window as any)[key] = null; } catch (_) {}
      });
    }
  } catch (e) {
    // Browser doesn't support PerformanceObserver or access denied
  }
}
