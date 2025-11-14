const cache = new Map<string, any[]>();

function getCacheKey(id: string, type: 'post' | 'story') {
  return `${type}:${id}`;
}

export function getCachedComments(id: string, type: 'post' | 'story' = 'post') {
  return cache.get(getCacheKey(id, type));
}

export function setCachedComments(id: string, comments: any[], type: 'post' | 'story' = 'post') {
  try { cache.set(getCacheKey(id, type), comments.slice()); } catch (_) {}
}

export function hasCachedComments(id: string, type: 'post' | 'story' = 'post') {
  return cache.has(getCacheKey(id, type));
}

export async function prefetchComments(id: string, fetcher: (id: string) => Promise<any[]>, type: 'post' | 'story' = 'post') {
  const key = getCacheKey(id, type);
  if (cache.has(key)) return cache.get(key);
  try {
    const data = await fetcher(id);
    cache.set(key, data.slice());
    return data;
  } catch (e) {
    // don't cache failures
    return undefined;
  }
}

export function clearCachedComments(id: string, type: 'post' | 'story' = 'post') {
  cache.delete(getCacheKey(id, type));
}

const commentCache = { getCachedComments, setCachedComments, hasCachedComments, prefetchComments, clearCachedComments };

export default commentCache;
