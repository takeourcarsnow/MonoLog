// Enhanced performance monitoring utilities
// Tracks component render times, API call latency, and custom metrics

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'render' | 'api' | 'custom';
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100; // Keep last 100 metrics

  // Track component render performance
  trackRender(componentName: string, renderTime: number) {
    this.addMetric({
      name: `render:${componentName}`,
      value: renderTime,
      timestamp: Date.now(),
      type: 'render',
    });
  }

  // Track API call performance
  trackApiCall(endpoint: string, duration: number) {
    this.addMetric({
      name: `api:${endpoint}`,
      value: duration,
      timestamp: Date.now(),
      type: 'api',
    });
  }

  // Track custom metrics
  trackCustom(name: string, value: number) {
    this.addMetric({
      name,
      value,
      timestamp: Date.now(),
      type: 'custom',
    });
  }

  private addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log slow operations in development
    if (process.env.NODE_ENV !== 'production') {
      if (metric.type === 'render' && metric.value > 16) {
        console.warn(`Slow render: ${metric.name} took ${metric.value.toFixed(2)}ms`);
      } else if (metric.type === 'api' && metric.value > 1000) {
        console.warn(`Slow API call: ${metric.name} took ${metric.value.toFixed(2)}ms`);
      }
    }
  }

  // Get metrics summary
  getSummary() {
    const summary: Record<string, { count: number; avg: number; max: number; min: number }> = {};

    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          count: 0,
          avg: 0,
          max: 0,
          min: Infinity,
        };
      }

      const s = summary[metric.name];
      s.count++;
      s.max = Math.max(s.max, metric.value);
      s.min = Math.min(s.min, metric.value);
      s.avg = ((s.avg * (s.count - 1)) + metric.value) / s.count;
    });

    return summary;
  }

  // Clear all metrics
  clear() {
    this.metrics = [];
  }

  // Export metrics for analysis
  export() {
    return {
      metrics: [...this.metrics],
      summary: this.getSummary(),
      timestamp: Date.now(),
    };
  }
}

// Singleton instance
export const perfMonitor = new PerformanceMonitor();

// React hook for tracking component render time
export function useRenderTime(componentName: string) {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    perfMonitor.trackRender(componentName, renderTime);
  };
}

// Decorator for tracking async function execution time
export function trackPerformance(name: string, type: 'api' | 'custom' = 'custom') {
  return function <T extends (...args: any[]) => Promise<any>>(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = performance.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - start;
        
        if (type === 'api') {
          perfMonitor.trackApiCall(name, duration);
        } else {
          perfMonitor.trackCustom(name, duration);
        }
        
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        perfMonitor.trackCustom(`${name}:error`, duration);
        throw error;
      }
    };

    return descriptor;
  };
}

// Utility to measure async operations
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  type: 'api' | 'custom' = 'custom'
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    if (type === 'api') {
      perfMonitor.trackApiCall(name, duration);
    } else {
      perfMonitor.trackCustom(name, duration);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    perfMonitor.trackCustom(`${name}:error`, duration);
    throw error;
  }
}

// Export performance summary to console
export function logPerformanceSummary() {
  const summary = perfMonitor.getSummary();
  console.table(summary);
  return summary;
}
