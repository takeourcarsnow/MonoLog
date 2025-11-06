// Centralized SQL select fragments for Supabase queries.
// Keeping them in one place reduces duplication and accidental drift.

// Posts joined with optional users/public_profiles for display fields
export const SELECT_POST_WITH_PROFILES = `
  *,
  users!left(id, username, display_name, avatar_url),
  public_profiles!left(id, username, display_name, avatar_url)
`;

// Communities with creator join alias used in multiple places
export const SELECT_COMMUNITY_WITH_CREATOR = `
  *,
  users!communities_creator_id_fkey(id, username, display_name, avatar_url)
`;

// Helper builders to keep call sites terse while allowing chaining
export function postsSelect(sb: any) {
  return sb.from('posts').select(SELECT_POST_WITH_PROFILES);
}

export function communitiesSelect(sb: any) {
  return sb.from('communities').select(SELECT_COMMUNITY_WITH_CREATOR);
}
