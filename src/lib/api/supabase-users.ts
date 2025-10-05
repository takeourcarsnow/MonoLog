import type { User } from "../types";
import { getClient, ensureAuthListener, getCachedAuthUser, logSupabaseError } from "./supabase-client";
import { mapProfileToUser, DEFAULT_AVATAR } from "./supabase-utils";
import { logger } from "../logger";

export async function getUsers() {
  const sb = getClient();
  const { data, error } = await sb.from("users").select("*");
  logSupabaseError("getUsers", { data, error });
  if (error) throw error;
  return data || [];
}

export async function getCurrentUser() {
  try {
    const sb = getClient();
    ensureAuthListener(sb);
    const user = await getCachedAuthUser(sb);
    if (!user) return null;
    // try to find a matching profile in users table
    const { data: profile, error: profErr } = await sb.from("users").select("*").eq("id", user.id).limit(1).maybeSingle();
    if (profErr) {
      // Real query error (e.g. permissions); fall back to synthesized profile (no DB write)
      const synthUsername = user.user_metadata?.username || user.email?.split("@")[0] || user.id;
      const synthDisplay = user.user_metadata?.name || synthUsername;
  const synthAvatar = user.user_metadata?.avatar_url || DEFAULT_AVATAR;
      const joinedAt = new Date().toISOString();
      return { id: user.id, username: synthUsername, displayName: synthDisplay, avatarUrl: synthAvatar, joinedAt } as any;
    }

    if (!profile) {
      // Row truly missing. Insert a minimal profile.
      const synthUsername = user.user_metadata?.username || user.email?.split("@")[0] || user.id;
      const synthDisplay = user.user_metadata?.name || synthUsername;
  const synthAvatar = user.user_metadata?.avatar_url || DEFAULT_AVATAR;
      const joinedAt = new Date().toISOString();
      const insertObj: any = { id: user.id, username: synthUsername, display_name: synthDisplay, joined_at: joinedAt };
  if (synthAvatar) insertObj.avatar_url = synthAvatar;
      try {
        await sb.from("users").insert(insertObj);
      } catch (e) {
        // ignore duplicate or RLS failures; we still return synthesized profile
      }
      return { id: user.id, username: synthUsername, displayName: synthDisplay, avatarUrl: synthAvatar, joinedAt } as any;
    }
    return mapProfileToUser(profile) as any;
  } catch (e) {
    return null;
  }
}

export async function loginAs() { return null; }

export async function getUser(id: string) {
  const sb = getClient();
  const { data, error } = await sb.from("users").select("*").eq("id", id).limit(1).single();
  if (error) return null;
  const profile = data as any;
  return mapProfileToUser(profile) as any;
}

// Resolve a username (or legacy user_name) to a profile. Returns null when not found.
export async function getUserByUsername(username: string) {
  // getClient() may throw synchronously if build-time NEXT_PUBLIC_* vars
  // are missing and the runtime override hasn't yet injected window.__MONOLOG_RUNTIME_SUPABASE__.
  // To avoid a hard failure during hydration/refresh, poll briefly for the
  // runtime keys and retry getClient() before giving up.
  let sb: any = null;
  try {
    sb = getClient();
  } catch (err) {
    // If we're in a browser environment, wait up to 1s for the runtime
    // override to populate keys and then try again. This handles the
    // race where the bundle was built without NEXT_PUBLIC_ vars but the
    // server provides them at runtime via /api/debug/env.
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
        // give up and return null so caller shows 'not found' instead of crashing
        return null;
      }
    } else {
      return null;
    }
  }

  try {
    // try common column name 'username'
    let res: any = await sb.from("users").select("*").eq("username", username).limit(1).maybeSingle();
    if (!res.error && res.data) return mapProfileToUser(res.data) as any;
  } catch (e) {
    // ignore and try fallback
  }
  try {
    // fallback to legacy 'user_name' column
    let res2: any = await sb.from("users").select("*").eq("user_name", username).limit(1).maybeSingle();
    if (!res2.error && res2.data) return mapProfileToUser(res2.data) as any;
  } catch (e) {
    // ignore
  }
  // final attempt: case-insensitive match on username
  try {
    const res3: any = await sb.from("users").select("*").ilike("username", username).limit(1).maybeSingle();
    if (!res3.error && res3.data) return mapProfileToUser(res3.data) as any;
  } catch (e) {
    // ignore
  }
  return null;
}

export async function updateUser(id: string, patch: Partial<User>) {
  const sb = getClient();
  const upd: any = {};
  if (patch.username !== undefined) upd.username = patch.username;
  if (patch.displayName !== undefined) upd.display_name = patch.displayName;
  if (patch.avatarUrl !== undefined) upd.avatar_url = patch.avatarUrl;
  if (patch.bio !== undefined) upd.bio = patch.bio;
  const { error, data } = await sb.from("users").update(upd).eq("id", id).select("*").limit(1).single();
  if (error) throw error;
  const profile = data as any;
  return {
    id: profile.id,
    username: profile.username || profile.user_name,
    displayName: profile.displayName || profile.display_name,
avatarUrl: profile.avatarUrl || profile.avatar_url || DEFAULT_AVATAR,
    bio: profile.bio,
    joinedAt: profile.joinedAt || profile.joined_at,
  } as any;
}

export async function updateCurrentUser(patch: Partial<User>) {
  const sb = getClient();
  ensureAuthListener(sb);
  const user = await getCachedAuthUser(sb);
  if (!user) throw new Error("Not logged in");
  
  // Check if username is being changed and enforce 24-hour cooldown
  if (patch.username !== undefined) {
    const { data: currentProfile } = await sb.from("users").select("username, username_changed_at").eq("id", user.id).limit(1).single();
    
    if (currentProfile) {
      const lastChanged = currentProfile.username_changed_at;
      const now = Date.now();
      
      // Only enforce cooldown if username is actually changing
      if (currentProfile.username !== patch.username) {
        if (lastChanged) {
          const lastChangedTime = new Date(lastChanged).getTime();
          const hoursSinceChange = (now - lastChangedTime) / (1000 * 60 * 60);
          
          if (hoursSinceChange < 24) {
            const hoursRemaining = Math.ceil(24 - hoursSinceChange);
            const nextChangeDate = new Date(lastChangedTime + 24 * 60 * 60 * 1000);
            throw new Error(`You can only change your username once every 24 hours. Try again in ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''} (${nextChangeDate.toLocaleString()}).`);
          }
        }
      }
    }
  }
  
  const upsertObj: any = { id: user.id };
  if (patch.username !== undefined) {
    upsertObj.username = patch.username;
    upsertObj.username_changed_at = new Date().toISOString();
  }
  if (patch.displayName !== undefined) upsertObj.display_name = patch.displayName;
  if (patch.avatarUrl !== undefined) upsertObj.avatar_url = patch.avatarUrl;
  if (patch.bio !== undefined) upsertObj.bio = patch.bio;
  const safe = (v: any) => { try { return JSON.stringify(v, null, 2); } catch (e) { try { return String(v); } catch { return "[unserializable]"; } } };
logger.debug("users.upsert payload", safe(upsertObj));
  const res = await sb.from("users").upsert(upsertObj).select("*").limit(1).single();
logger.debug("users.upsert result (stringified)", safe(safe(res)));
  const { error, data } = res as any;
  if (error) {
    console.error("users.upsert error", { message: error.message || error, code: error.code || error?.status || null, details: error.details || error?.error || null, full: error });
    throw error;
  }
  const profile = data as any;
  return {
    id: profile.id,
    username: profile.username || profile.user_name,
    displayName: profile.displayName || profile.display_name,
avatarUrl: profile.avatarUrl || profile.avatar_url || DEFAULT_AVATAR,
    bio: profile.bio,
    joinedAt: profile.joinedAt || profile.joined_at,
    usernameChangedAt: profile.username_changed_at || profile.usernameChangedAt,
  } as any;
}

export async function signOut() {
  try {
    const sb = getClient();
    await sb.auth.signOut();
    // Immediately invalidate cached auth user so subsequent calls to
    // getCurrentUser() in the same client session do not return the
    // stale signed-in user before the onAuthStateChange listener fires.
    (globalThis as any).cachedAuthUser = null;
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:changed'));
      }
    } catch (_) { /* ignore */ }
  } catch (e) {
    console.warn("supabase.signOut failed", e);
  }
}
