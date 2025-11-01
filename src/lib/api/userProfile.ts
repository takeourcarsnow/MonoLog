import { DEFAULT_AVATAR } from "./utils";

export function extractUserProfile(user: any): { username: string; displayName: string; avatarUrl: string } {
  const md = user.user_metadata || user.raw_user_meta_data || user.raw_app_meta_data || {};
  let username = md.username || (user.email ? user.email.split('@')[0] : String(user.id || 'unknown').slice(0, 8));
  let displayName = md.name || username;
  let avatarUrl = md.avatar_url || md.avatarUrl || DEFAULT_AVATAR;
  return { username, displayName, avatarUrl };
}