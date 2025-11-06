import { DEFAULT_AVATAR, mapProfileToUser } from "./utils";

export function extractUserProfile(user: any): { username: string; displayName: string; avatarUrl: string } {
  const md = user.user_metadata || user.raw_user_meta_data || user.raw_app_meta_data || {};
  let username = md.username || (user.email ? user.email.split('@')[0] : String(user.id || 'unknown').slice(0, 8));
  let displayName = md.name || username;
  let avatarUrl = md.avatar_url || md.avatarUrl || DEFAULT_AVATAR;
  return { username, displayName, avatarUrl };
}

// Ensure there is a profile row for the given authenticated user. Returns a
// normalized user object. If the users table lookup fails with an error, we
// synthesize a profile without writing to DB. If no row exists, we attempt to
// insert a minimal row and still return a synthesized profile on failure.
export async function ensureProfileForAuthUser(sb: any, authUser: any) {
  if (!sb || !authUser) return null;
  try {
    const { data: profile, error: profErr } = await sb.from("users").select("*").eq("id", authUser.id).limit(1).maybeSingle();
    if (profErr) {
      const { username, displayName, avatarUrl } = extractUserProfile(authUser);
      const joinedAt = new Date().toISOString();
      return { id: authUser.id, username, displayName, avatarUrl, joinedAt } as any;
    }
    if (!profile) {
      const { username, displayName, avatarUrl } = extractUserProfile(authUser);
      const joinedAt = new Date().toISOString();
      const insertObj: any = { id: authUser.id, username, display_name: null, joined_at: joinedAt };
      if (avatarUrl) insertObj.avatar_url = avatarUrl;
      try { await sb.from("users").insert(insertObj); } catch (e) { /* ignore */ }
      return { id: authUser.id, username, displayName, avatarUrl, joinedAt } as any;
    }
    return mapProfileToUser(profile) as any;
  } catch (e) {
    const { username, displayName, avatarUrl } = extractUserProfile(authUser);
    const joinedAt = new Date().toISOString();
    return { id: authUser.id, username, displayName, avatarUrl, joinedAt } as any;
  }
}