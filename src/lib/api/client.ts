import { createBrowserClient, SupabaseClient } from "@supabase/ssr";
import { SUPABASE } from "../config";

let supabase: SupabaseClient | null = null;
// cached auth user to avoid repeated auth.getUser() calls during a client session.
// undefined = not yet fetched, null = fetched and no active session, object = auth user
let cachedAuthUser: any | null | undefined = undefined;
let authStateSub: any = null;
// Prevent concurrent auth fetches
let authFetchPromise: Promise<any> | null = null;

export function getClient() {
  if (supabase) return supabase;
  // Prefer build-time NEXT_PUBLIC_* values, but if those are not present (for
  // example when the client bundle was built before .env.local existed), allow
  // a runtime injection via window.__MONOLOG_RUNTIME_SUPABASE__ which is set
  // by the runtime override helper. This is safe because the anon key and URL
  // are public values intended for client-side use.
  let url = SUPABASE.url;
  let anonKey = SUPABASE.anonKey;
  try {
    if ((!url || !anonKey) && typeof window !== 'undefined' && (window as any).__MONOLOG_RUNTIME_SUPABASE__) {
      const r = (window as any).__MONOLOG_RUNTIME_SUPABASE__;
      url = url || r.url || '';
      anonKey = anonKey || r.anonKey || '';
    }
  } catch (e) {
    // ignore
  }
  if (!url || !anonKey) {
    throw new Error("Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  supabase = createBrowserClient(url, anonKey, {
    cookieOptions: {
      name: 'sb-gfvdnpcrscszzyicsycp-auth-token',
      lifetime: 60 * 60 * 24 * 7, // 7 days
      domain: '',
      path: '/',
      sameSite: 'lax',
    },
    auth: {
      flowType: 'pkce',
    },
  });
  return supabase;
}

// Fetch auth user once and cache the result. If an auth error indicates no session,
// cache null. Also log unexpected errors via logSupabaseError for visibility.
export async function fetchAndCacheAuthUser(sb: SupabaseClient) {
  // If already fetching, wait for the existing request
  if (authFetchPromise) {
    return await authFetchPromise;
  }

  authFetchPromise = (async () => {
    try {
      const { data, error } = await sb.auth.getUser();
      logSupabaseError("auth.getUser", { data, error });
      if (error) {
        // benign missing-session errors are filtered by logSupabaseError; still cache null
        cachedAuthUser = null;
        return null;
      }
      const user = (data as any)?.user ?? null;
      cachedAuthUser = user;
      return user;
    } catch (e) {
      cachedAuthUser = null;
      return null;
    } finally {
      authFetchPromise = null;
    }
  })();

  return await authFetchPromise;
}

// Return cached auth user when available, otherwise fetch and cache it.
export async function getCachedAuthUser(sb: SupabaseClient) {
  if (cachedAuthUser !== undefined) return cachedAuthUser;
  return await fetchAndCacheAuthUser(sb);
}

// Return a current access token string for Authorization header when calling
// server endpoints. May return null when there's no active session.
export async function getAccessToken(sb: SupabaseClient) {
  try {
    // supabase-js v2 exposes getSession/getUser; use getSession to read access_token
    // without triggering a redirect. If not available, fall back to auth.getUser
    if (!sb) return null;
    try {
      // @ts-ignore - runtime-safe call
      const sessionRes = await sb.auth.getSession?.();
      if (sessionRes && sessionRes.data && sessionRes.data.session && sessionRes.data.session.access_token) {
        return sessionRes.data.session.access_token;
      }
    } catch (e) {
      // ignore and fallback
    }
    try {
      const userRes = await sb.auth.getUser();
      // auth.getUser doesn't return token; last-resort return null
      return null;
    } catch (e) {
      return null;
    }
  } catch (e) {
    return null;
  }
}

// Set up a client-side auth state change listener to keep the cache in sync.
export function ensureAuthListener(sb: SupabaseClient) {
  if (typeof window === "undefined") return;
  if (authStateSub) return;
  try {
    // supabase-js v2 returns a { data: { subscription } } shape from onAuthStateChange
    const sub = sb.auth.onAuthStateChange((event: string, session: any) => {
      // Clear any pending auth fetch when auth state changes
      authFetchPromise = null;
      // session may be null on sign-out
      cachedAuthUser = session?.user ?? null;
    });
    authStateSub = sub;
  } catch (e) {
    // non-fatal; listener is only an optimization
  }
}

// helper to log Supabase errors in the browser console with context
export function logSupabaseError(context: string, res: { data?: any; error?: any }) {
  try {
    if (typeof window === "undefined") return;
    if (!res) return;
    const { error, data } = res as any;
    if (error) {
      // Certain auth errors are expected when there's no active session
      // (for example calling auth.getUser() before sign-in). Those are
      // noisy but benign; ignore them to avoid spamming the console.
      const msg = error?.message || "";
      if (typeof msg === "string") {
        const lower = msg.toLowerCase();
        if (lower.includes("auth session missing") || lower.includes("no active session")) {
          return;
        }
      }
      // provide a concise, copyable object
      console.error(`Supabase error (${context})`, { message: error.message || error, code: error.code || error?.status || null, details: error.details || error, data });
    }
  } catch (e) {
    // swallow logging errors
    console.error("Failed to log supabase error", e);
  }
}

// export the client accessor for UI components (auth flows) to call
export function getSupabaseClient() {
  return getClient();
}

// also export a named helper for other modules to access the raw supabase client
export function getSupabaseClientRaw() {
  return getClient();
}
