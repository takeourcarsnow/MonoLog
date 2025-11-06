import { getClient, logSupabaseError } from "../client";
import { mapRowToHydratedPost } from "../utils";
import { SELECT_POST_WITH_PROFILES } from "../sql";

export async function getUserPosts(userId: string) {
  const sb = getClient();
  const { data, error } = await sb.from("posts").select(SELECT_POST_WITH_PROFILES).eq("user_id", userId).order("created_at", { ascending: false });
  logSupabaseError("getUserPosts", { data, error });
  if (error) throw error;
  return (data || []).map((row: any) => mapRowToHydratedPost(row));
}

export async function getPostsByDate(dateKey: string) {
  const sb = getClient();
  const start = new Date(dateKey + "T00:00:00.000Z");
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  const { data, error } = await sb.from("posts").select(SELECT_POST_WITH_PROFILES).gte("created_at", start.toISOString()).lt("created_at", end.toISOString()).order("created_at", { ascending: false });
  logSupabaseError("getPostsByDate", { data, error });
  if (error) throw error;
  return (data || []).map((row: any) => mapRowToHydratedPost(row));
}