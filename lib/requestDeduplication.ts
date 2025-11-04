/**
 * Request deduplication utility to prevent multiple identical requests
 * from executing simultaneously. Useful for preventing race conditions
 * and reducing server load when components mount/unmount quickly.
 */

type PendingRequest<T> = Promise<T>;
const pendingRequests = new Map<string, PendingRequest<any>>();

/**
 * Deduplicate requests by key. If a request with the same key is already
 * in flight, return the existing promise instead of creating a new one.
 */
export async function dedupe<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 100
): Promise<T> {
  // Check if there's already a pending request
  const existing = pendingRequests.get(key);
  if (existing) {
    return existing;
  }

  // Create new request
  const promise = fn().finally(() => {
    // Clean up after a short delay to allow rapid sequential calls
    // to still benefit from deduplication
    setTimeout(() => {
      pendingRequests.delete(key);
    }, ttl);
  });

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Clear all pending requests (useful for testing or forced refresh)
 */
export function clearPendingRequests() {
  pendingRequests.clear();
}
