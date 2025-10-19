import { getClient, ensureAuthListener, logSupabaseError, getAccessToken } from "../client";
import { mapRowToHydratedPost } from "../utils";
import { resolvePostId, fetchPostWithFallbacks } from "./helpers";

export async function getPost(id: string) {
  // getClient() may throw synchronously if build-time NEXT_PUBLIC_* vars
  // are missing and the runtime override hasn't been applied yet. Wait
  // briefly for the runtime injection and retry to avoid returning
  // "Post not found" on hard refresh.
  let sb: any = null;
  try {
    sb = getClient();
  } catch (err) {
    if (typeof window !== 'undefined') {
      const waitForRuntime = async (timeout = 1000, interval = 100) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
          if ((window as any).__MONOLOG_RUNTIME_SUPABASE__) {
            try {
              return getClient();
            } catch (e) {
              // continue waiting
            }
          }
          // small delay
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, interval));
        }
        // final attempt
        return getClient();
      };
      try {
        sb = await waitForRuntime();
      } catch (e) {
        return null;
      }
    } else {
      return null;
    }
  }

  const { raw, candidateId } = resolvePostId(id);
  const data = await fetchPostWithFallbacks(sb, raw, candidateId);
  if (data) {
    logSupabaseError("getPost", { data });
    return mapRowToHydratedPost(data) as any;
  }
  return null;
}

export async function updatePost(id: string, patch: { caption?: string; alt?: string; public?: boolean }) {
  const sb = getClient();
  ensureAuthListener(sb);
  const token = await getAccessToken(sb);
  const res = await fetch('/api/posts/update', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ id, patch }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to update post');
  // If the server returned the updated post row, use it to avoid a stale re-fetch
  if (json && json.post) return mapRowToHydratedPost(json.post) as any;
  return await getPost(id) as any;
}

export async function deletePost(id: string) {
  const sb = getClient();
  ensureAuthListener(sb);
  const token = await getAccessToken(sb);
  const res = await fetch('/api/posts/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ id }) });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to delete post');
  return true;
}