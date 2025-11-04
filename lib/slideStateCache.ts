const cache = new Map<string, any>();

export function setSlideState(key: string, state: any) {
  try { cache.set(key, state); } catch (_) {}
}

export function getSlideState<T = any>(key: string): T | undefined {
  try { return cache.get(key) as T; } catch (_) { return undefined; }
}
