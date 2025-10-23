import type { User } from "../types";
import { getClient, ensureAuthListener, getCachedAuthUser, logSupabaseError, getAccessToken } from "./client";
import { mapProfileToUser, DEFAULT_AVATAR } from "./utils";
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
      const synthAvatar = user.user_metadata?.avatar_url || DEFAULT_AVATAR;
      const joinedAt = new Date().toISOString();
      return { id: user.id, username: synthUsername, displayName: null, avatarUrl: synthAvatar, joinedAt } as any;
    }
    if (!profile) {
      // Row truly missing. Insert a minimal profile.
      const synthUsername = user.user_metadata?.username || user.email?.split("@")[0] || user.id;
      const synthAvatar = user.user_metadata?.avatar_url || DEFAULT_AVATAR;
      const joinedAt = new Date().toISOString();
      const insertObj: any = { id: user.id, username: synthUsername, display_name: null, joined_at: joinedAt };
      if (synthAvatar) insertObj.avatar_url = synthAvatar;
      try {
        await sb.from("users").insert(insertObj);
      } catch (e) {
        // ignore duplicate or RLS failures; we still return synthesized profile
      }
      return { id: user.id, username: synthUsername, displayName: null, avatarUrl: synthAvatar, joinedAt } as any;
    }
    return mapProfileToUser(profile) as any;
  } catch (e) {
    return null;
  }
}

export async function loginAs() { return null; }

export async function getUser(id: string) {
  try {
    const resp = await fetch(`/api/users/${encodeURIComponent(id)}`);
    if (!resp.ok) {
      return null;
    }
    const data = await resp.json();
    return data.user || null;
  } catch (e) {
    console.error('Error fetching user by id:', e);
    return null;
  }
}

// Resolve a username (or legacy user_name) to a profile. Returns null when not found.
export async function getUserByUsername(username: string) {
  try {
    const resp = await fetch(`/api/users/${encodeURIComponent(username)}`);
    if (!resp.ok) {
      return null;
    }
    const data = await resp.json();
    return data.user || null;
  } catch (e) {
    console.error('Error fetching user by username:', e);
    return null;
  }
}

export async function updateUser(id: string, patch: Partial<User>) {
  const sb = getClient();
  const upd: any = {};
  if (patch.username !== undefined) upd.username = patch.username;
  if (patch.displayName !== undefined) upd.display_name = patch.displayName;
  if (patch.avatarUrl !== undefined) upd.avatar_url = patch.avatarUrl;
  if (patch.bio !== undefined) upd.bio = patch.bio;
  if (patch.socialLinks !== undefined) upd.socialLinks = patch.socialLinks ? JSON.stringify(patch.socialLinks) : null;
  const { error, data } = await sb.from("users").update(upd).eq("id", id).select("*").limit(1).single();
  if (error) throw error;
  const profile = data as any;
  return mapProfileToUser(profile) as any;
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
  if (patch.socialLinks !== undefined) upsertObj.socialLinks = patch.socialLinks;
  if (patch.exifPresets !== undefined) upsertObj.exifPresets = patch.exifPresets;
  const safe = (v: any) => { try { return JSON.stringify(v, null, 2); } catch (e) { try { return String(v); } catch { return "[unserializable]"; } } };
logger.debug("users.upsert payload", safe(upsertObj));
  // Try to perform the update via the server-side endpoint which verifies the
  // bearer token and uses the service-role client. This avoids client-side
  // upserts which can hit RLS INSERT/UPSERT policies. If the server call fails
  // for any reason (no token, network, auth), fall back to the previous
  // upsert/update behavior.
  // Always require a server-side update path. Attempt to get the current
  // access token and call the server PATCH endpoint. Do NOT fall back to a
  // client-side upsert/update because that can hit RLS INSERT/UPSERT policies.
  const token = await getAccessToken(sb);
  if (!token) {
    throw new Error('Update failed: no access token available. Ensure the user is signed in and the client can read the session token before calling updateCurrentUser.');
  }
  const resp = await fetch('/api/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(upsertObj),
  });
  try {
    console.log('[api.updateCurrentUser] outgoing payload', Object.keys(upsertObj).length ? upsertObj : '(empty)');
    console.log('[api.updateCurrentUser] server status', resp.status, resp.statusText);
  } catch (_) {}
  if (!resp.ok) {
    const bodyText = await resp.text().catch(() => null);
    console.error('[api.updateCurrentUser] server error body', bodyText);
    throw new Error(`Server update failed: ${resp.status} ${resp.statusText} ${bodyText || ''}`);
  }
  let profile: any = await resp.json();
  try { console.log('[api.updateCurrentUser] server returned profile keys', profile ? Object.keys(profile) : null); } catch (_) {}
  // Some server endpoints historically returned { user: { ... } } wrappers.
  // Be tolerant: if we received an envelope, unwrap it.
  if (profile && profile.user && typeof profile.user === 'object') {
    try { console.log('[api.updateCurrentUser] detected envelope, unwrapping profile.user'); } catch (_) {}
    profile = profile.user;
  }
  if (!profile) {
    const bodyText = await (async () => {
      try { return JSON.stringify(profile); } catch { return String(profile); }
    })();
    throw new Error(`Server update failed: empty profile returned (${bodyText}).`);
  }
  if (!profile) {
    const bodyText = await (async () => {
      try { return JSON.stringify(profile); } catch { return String(profile); }
    })();
    throw new Error(`Server update failed: empty profile returned (${bodyText}).`);
  }
  // Use the shared mapper so fields like displayName are normalized
  const mapped = mapProfileToUser(profile) as any;
  mapped.usernameChangedAt = profile.username_changed_at || profile.usernameChangedAt;
  return mapped as any;
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

export async function deleteCurrentUser() {
  const sb = getClient();
  ensureAuthListener(sb);
  const user = await getCachedAuthUser(sb);
  if (!user) throw new Error("Not logged in");

  const token = await getAccessToken(sb);
  if (!token) {
    throw new Error('Delete failed: no access token available. Ensure the user is signed in.');
  }

  const resp = await fetch('/api/users/me', {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!resp.ok) {
    const bodyText = await resp.text().catch(() => null);
    throw new Error(`Delete failed: ${resp.status} ${resp.statusText} ${bodyText || ''}`);
  }

  // After successful deletion, sign out
  await signOut();
}
