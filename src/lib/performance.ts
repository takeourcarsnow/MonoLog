// Lightweight Web Vitals reporter (client-only).
// Usage: import { initWebVitals } from '@/lib/performance'; initWebVitals();
// Sends metrics to console and (optionally) a custom endpoint for analytics.

// Types are optional; if web-vitals types aren't installed we fallback to any.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import type { ReportHandler } from 'web-vitals';

let inited = false;

export function initWebVitals(options?: { endpoint?: string; sampleRate?: number }) {
  if (inited || typeof window === 'undefined') return;
  inited = true;
  const endpoint = options?.endpoint;
  const sampleRate = options?.sampleRate ?? 1; // 1 = 100%

  (async () => {
    try {
      const { onCLS, onFID, onLCP, onINP, onTTFB } = await import('web-vitals');
  const handler: ReportHandler = (metric: any) => {
        try {
          // Basic client console log for quick inspection during development.
          // web-vitals console output removed per user request
          if (!endpoint) return;
          if (Math.random() > sampleRate) return;
          const body = JSON.stringify({
            id: metric.id,
            name: metric.name,
            value: metric.value,
            rating: (metric as any).rating,
            navigationType: (performance as any)?.navigation?.type,
            url: window.location.pathname,
            ua: navigator.userAgent,
            ts: Date.now(),
          });
          // Fire‑and‑forget; keep it very small (no await) so it doesn't block hydration.
          navigator.sendBeacon?.(endpoint, body) || fetch(endpoint, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
        } catch (_) { /* ignore */ }
      };
      onCLS(handler);
      onFID(handler);
      onLCP(handler);
      onINP?.(handler as any); // INP in newer versions
      onTTFB(handler);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[performance] web-vitals import failed', e);
    }
  })();
}

// Tiny helper to mark custom spans (e.g. API latency) and measure.
export function markSpan(name: string, fn: () => Promise<any> | any): Promise<any> {
  const startMark = `${name}-start-${performance.now()}`;
  performance.mark(startMark);
  const p = Promise.resolve().then(fn);
  return p.finally(() => {
    const endMark = `${name}-end-${performance.now()}`;
    performance.mark(endMark);
    try {
      performance.measure(name, startMark, endMark);
    } catch (_) {/* ignore */}
  });
}

export function getMeasurements(prefix?: string) {
  try {
    return performance.getEntriesByType('measure').filter(m => !prefix || m.name.startsWith(prefix));
  } catch {
    return [];
  }
}