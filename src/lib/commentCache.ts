const cache = new Map<string, any[]>();

export function getCachedComments(postId: string) {
  return cache.get(postId);
}

export function setCachedComments(postId: string, comments: any[]) {
  try { cache.set(postId, comments.slice()); } catch (_) {}
}

export function hasCachedComments(postId: string) {
  return cache.has(postId);
}

export async function prefetchComments(postId: string, fetcher: (id: string) => Promise<any[]>) {
  if (cache.has(postId)) return cache.get(postId);
  try {
    const data = await fetcher(postId);
    cache.set(postId, data.slice());
    return data;
  } catch (e) {
    // don't cache failures
    return undefined;
  }
}

export function clearCachedComments(postId: string) {
  cache.delete(postId);
}

export default { getCachedComments, setCachedComments, hasCachedComments, prefetchComments, clearCachedComments };
