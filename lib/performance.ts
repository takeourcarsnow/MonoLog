/**
 * Performance Monitoring Utilities
 * 
 * Use these utilities to monitor the impact of optimizations in production.
 * Import and use strategically to avoid adding unnecessary bundle weight.
 */

type PerformanceMetric = {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
};

/**
 * Report Core Web Vitals to your analytics service
 * Already implemented in ClientInit component via web-vitals package
 */
export function reportWebVitals(metric: PerformanceMetric) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Performance]', metric.name, metric.value, metric.rating);
    return;
  }

  // Send to your analytics service
  // Example: Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_rating: metric.rating,
      non_interaction: true,
    });
  }
}

/**
 * Measure component render time
 * Use sparingly - adds overhead
 */
export function measureRenderTime(componentName: string) {
  if (process.env.NODE_ENV !== 'production') {
    const startMark = `${componentName}-render-start`;
    const endMark = `${componentName}-render-end`;
    const measureName = `${componentName}-render`;

    return {
      start: () => performance.mark(startMark),
      end: () => {
        performance.mark(endMark);
        try {
          performance.measure(measureName, startMark, endMark);
          const measure = performance.getEntriesByName(measureName)[0];
          console.log(`[Render Time] ${componentName}:`, measure.duration.toFixed(2), 'ms');
          performance.clearMarks(startMark);
          performance.clearMarks(endMark);
          performance.clearMeasures(measureName);
        } catch (e) {
          // Ignore measurement errors
        }
      },
    };
  }
  return { start: () => {}, end: () => {} };
}

/**
 * Monitor API response times
 */
export async function measureApiCall<T>(
  url: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await fetchFn();
    const duration = performance.now() - startTime;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[API] ${url}:`, duration.toFixed(2), 'ms');
    }
    
    // Log slow API calls in production
    if (duration > 1000) {
      console.warn(`[Slow API] ${url}:`, duration.toFixed(2), 'ms');
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[API Error] ${url}:`, duration.toFixed(2), 'ms', error);
    throw error;
  }
}

/**
 * Check if performance API is available
 */
export function isPerformanceSupported(): boolean {
  return typeof window !== 'undefined' && 'performance' in window;
}

/**
 * Get navigation timing metrics
 */
export function getNavigationMetrics() {
  if (!isPerformanceSupported()) return null;

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (!navigation) return null;

  return {
    // Time to first byte
    ttfb: navigation.responseStart - navigation.requestStart,
    // DNS lookup time
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
    // TCP connection time
    tcp: navigation.connectEnd - navigation.connectStart,
    // Request time
    request: navigation.responseEnd - navigation.requestStart,
    // DOM processing
    domProcessing: navigation.domComplete - navigation.domInteractive,
    // Load complete
    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
  };
}

/**
 * Monitor memory usage (Chrome only)
 */
export function getMemoryUsage() {
  if (
    typeof window !== 'undefined' &&
    'performance' in window &&
    'memory' in (performance as any)
  ) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1048576), // MB
      totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1048576), // MB
      jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
    };
  }
  return null;
}

/**
 * Monitor chunk loading times
 */
export function monitorChunkLoading() {
  if (!isPerformanceSupported()) return;

  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'resource' && entry.name.includes('/_next/static/')) {
        const duration = entry.duration;
        const size = (entry as PerformanceResourceTiming).transferSize;
        
        if (process.env.NODE_ENV !== 'production') {
          console.log('[Chunk Load]', {
            url: entry.name.split('/').pop(),
            duration: duration.toFixed(2) + 'ms',
            size: size ? (size / 1024).toFixed(2) + 'KB' : 'cached',
          });
        }

        // Alert on slow chunks in production
        if (duration > 2000 && process.env.NODE_ENV === 'production') {
          console.warn('[Slow Chunk]', entry.name, duration.toFixed(2) + 'ms');
        }
      }
    });
  });

  observer.observe({ entryTypes: ['resource'] });
  
  return () => observer.disconnect();
}

/**
 * Export performance metrics for debugging
 */
export function exportMetrics() {
  if (!isPerformanceSupported()) return null;

  return {
    navigation: getNavigationMetrics(),
    memory: getMemoryUsage(),
    resources: performance.getEntriesByType('resource').map(entry => ({
      name: entry.name,
      duration: entry.duration,
      size: (entry as PerformanceResourceTiming).transferSize,
    })),
  };
}

/**
 * Simple performance budget checker
 */
export function checkPerformanceBudget() {
  const metrics = getNavigationMetrics();
  if (!metrics) return;

  const budgets = {
    ttfb: 600, // 600ms
    domProcessing: 1500, // 1.5s
    loadComplete: 3000, // 3s
  };

  const violations: string[] = [];
  
  if (metrics.ttfb > budgets.ttfb) {
    violations.push(`TTFB: ${metrics.ttfb.toFixed(0)}ms (budget: ${budgets.ttfb}ms)`);
  }
  if (metrics.domProcessing > budgets.domProcessing) {
    violations.push(`DOM Processing: ${metrics.domProcessing.toFixed(0)}ms (budget: ${budgets.domProcessing}ms)`);
  }
  if (metrics.loadComplete > budgets.loadComplete) {
    violations.push(`Load Complete: ${metrics.loadComplete.toFixed(0)}ms (budget: ${budgets.loadComplete}ms)`);
  }

  if (violations.length > 0) {
    console.warn('[Performance Budget Violated]', violations);
  } else if (process.env.NODE_ENV !== 'production') {
    console.log('[Performance Budget] ✅ All metrics within budget');
  }
}
