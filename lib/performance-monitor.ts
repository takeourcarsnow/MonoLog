"use client";

import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: ((metrics: PerformanceMetric[]) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // Initialize web vitals tracking
    onCLS((metric) => this.recordMetric('CLS', metric.value, metric.rating));
    onINP((metric) => this.recordMetric('INP', metric.value, metric.rating));
    onFCP((metric) => this.recordMetric('FCP', metric.value, metric.rating));
    onLCP((metric) => this.recordMetric('LCP', metric.value, metric.rating));
    onTTFB((metric) => this.recordMetric('TTFB', metric.value, metric.rating));

    // Track additional performance metrics
    this.trackNavigationTiming();
    this.trackResourceTiming();
    this.trackLongTasks();
  }

  private recordMetric(name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor') {
    const metric: PerformanceMetric = {
      name,
      value,
      rating,
      timestamp: Date.now()
    };

    this.metrics.push(metric);
    this.notifyObservers();

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${value} (${rating})`);
    }

    // Send to analytics in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(metric);
    }
  }

  private trackNavigationTiming() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.recordMetric('Navigation Timing', navigation.loadEventEnd - navigation.fetchStart, 'good');
        }
      });
    }
  }

  private trackResourceTiming() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      window.addEventListener('load', () => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const slowResources = resources.filter(r => r.duration > 1000); // Resources taking > 1s

        if (slowResources.length > 0) {
          this.recordMetric('Slow Resources', slowResources.length, 'needs-improvement');
        }
      });
    }
  }

  private trackLongTasks() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.duration > 50) { // Long task > 50ms
            this.recordMetric('Long Task', entry.duration, 'needs-improvement');
          }
        });
      });

      observer.observe({ entryTypes: ['longtask'] });
    }
  }

  private sendToAnalytics(metric: PerformanceMetric) {
    // Send to your analytics service
    // Example: gtag, mixpanel, etc.
    try {
      // For now, just store in localStorage for debugging
      const stored = localStorage.getItem('performance_metrics') || '[]';
      const metrics = JSON.parse(stored);
      metrics.push(metric);
      // Keep only last 100 metrics
      if (metrics.length > 100) {
        metrics.splice(0, metrics.length - 100);
      }
      localStorage.setItem('performance_metrics', JSON.stringify(metrics));
    } catch (e) {
      // Ignore storage errors
    }
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public subscribe(callback: (metrics: PerformanceMetric[]) => void) {
    this.observers.push(callback);
    return () => {
      this.observers = this.observers.filter(obs => obs !== callback);
    };
  }

  private notifyObservers() {
    this.observers.forEach(callback => callback(this.getMetrics()));
  }

  public getAverageRating(): 'good' | 'needs-improvement' | 'poor' {
    const ratings = this.metrics.map(m => m.rating);
    if (ratings.includes('poor')) return 'poor';
    if (ratings.includes('needs-improvement')) return 'needs-improvement';
    return 'good';
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;