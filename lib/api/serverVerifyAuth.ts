// Helper to verify incoming Authorization: Bearer <token> headers on server
// routes. Uses Supabase's auth REST endpoint to validate the token and return
// the user payload. This avoids relying on supabase-js client session plumbing
// on the server and keeps server routes simple and safe.
export async function getUserFromAuthHeader(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return null;
    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
    if (!base) return null;
    const resp = await fetch(`${base}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        // apikey header is tolerated by Supabase auth endpoint and using the
        // public anon key is safe here (it's already public client-side).
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      }
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    // expected shape includes id
    if (!json || !json.id) return null;
    return json;
  } catch (e) {
    return null;
  }
}

export function getTokenFromAuthHeader(req: Request) {
  const auth = req.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}
