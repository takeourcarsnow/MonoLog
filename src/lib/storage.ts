const NS = "monolog_v1";
let memory = new Map<string, string>();

function canUseLS() {
  if (typeof window === "undefined") return false;
  try {
    const k = "__ml_test";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

const LS = canUseLS();

// Keys that look like secrets should never be stored client-side.
const SENSITIVE_KEY_PATTERNS = [/token/i, /secret/i, /key/i, /auth/i, /password/i];

function isSensitiveKey(key: string) {
  return SENSITIVE_KEY_PATTERNS.some((r) => r.test(key));
}

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const namespaced = `${NS}:${key}`;
      if (LS) {
        const raw = window.localStorage.getItem(namespaced);
        if (!raw) return fallback;
        try {
          return JSON.parse(raw) as T;
        } catch (e) {
          // If JSON parse fails, remove the corrupted entry to avoid repeated errors
          try { window.localStorage.removeItem(namespaced); } catch {}
          return fallback;
        }
      } else {
        const raw = memory.get(namespaced);
        if (!raw) return fallback;
        try {
          return JSON.parse(raw) as T;
        } catch (e) {
          memory.delete(namespaced);
          return fallback;
        }
      }
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T) {
    try {
      if (isSensitiveKey(key)) {
        // refuse to store likely-sensitive keys client-side
        console.warn(`Refusing to store sensitive key in client storage: ${key}`);
        return;
      }
      const v = JSON.stringify(value);
      const namespaced = `${NS}:${key}`;
      if (LS) window.localStorage.setItem(namespaced, v);
      else memory.set(namespaced, v);
    } catch (e) {
      // swallow errors to avoid breaking UI; optionally report to monitoring offline
      try { console.warn('storage.set failed', e); } catch {}
    }
  },
  remove(key: string) {
    try {
      const namespaced = `${NS}:${key}`;
      if (LS) window.localStorage.removeItem(namespaced);
      else memory.delete(namespaced);
    } catch (e) {
      try { console.warn('storage.remove failed', e); } catch {}
    }
  },
};
