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

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      if (LS) {
        const raw = window.localStorage.getItem(`${NS}:${key}`);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
      } else {
        const raw = memory.get(`${NS}:${key}`);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
      }
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T) {
    const v = JSON.stringify(value);
    if (LS) window.localStorage.setItem(`${NS}:${key}`, v);
    else memory.set(`${NS}:${key}`, v);
  },
  remove(key: string) {
    if (LS) window.localStorage.removeItem(`${NS}:${key}`);
    else memory.delete(`${NS}:${key}`);
  },
};