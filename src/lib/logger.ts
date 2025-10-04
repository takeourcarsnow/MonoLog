// Centralized logger to prevent accidental sensitive data exposure in production.
// In production we suppress debug/info noise while keeping warnings and errors.
// Never pass secrets (service role keys, tokens, passwords) to these helpers.
// If you need to intentionally log an object, sanitize it first.
const isProd = process.env.NODE_ENV === 'production';

type LogFn = (...args: any[]) => void;

function safeWrap(fn: LogFn, level: 'debug' | 'log') : LogFn {
  if (isProd) return () => { /* no-op in production for privacy/noise */ };
  return (...args: any[]) => {
    try { fn(...args); } catch { /* swallow */ }
  };
}

export const logger = {
  debug: safeWrap(() => {}, 'debug'),
  info: safeWrap(() => {}, 'log'),
  log: safeWrap(() => {}, 'log'),
  warn: (...a: any[]) => { try { console.warn(...a); } catch {} },
  error: (...a: any[]) => { try { console.error(...a); } catch {} },
};

// Helper to create a redacted shallow copy of an object (basic heuristics).
export function redact<T extends Record<string, any>>(obj: T, opts: { keys?: (string|RegExp)[] } = {}) {
  if (!obj || typeof obj !== 'object') return obj;
  const patterns = (opts.keys || [/token/i, /secret/i, /password/i, /key/i]).map(p => typeof p === 'string' ? new RegExp(`^${p}$`, 'i') : p);
  const out: Record<string, any> = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    if (patterns.some(r => r.test(k))) {
      out[k] = '[redacted]';
    } else {
      const v = (obj as any)[k];
      out[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? '[object]' : v;
    }
  }
  return out as T;
}
