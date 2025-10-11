import type { CalendarStats } from "../types";
import { getClient, ensureAuthListener, getCachedAuthUser } from "./client";
import { toUTCDateKey } from "../date";

export async function calendarStats({ year, monthIdx }: { year: number; monthIdx: number }) {
  const sb = getClient();
  ensureAuthListener(sb);
  const me = await getCachedAuthUser(sb);
  // This implementation assumes posts.created_at is a timestamp
  const start = new Date(year, monthIdx, 1).toISOString();
  const end = new Date(year, monthIdx + 1, 1).toISOString();
  const { data, error } = await sb.from("posts").select("created_at, user_id, public").gte("created_at", start).lt("created_at", end);
  if (error) throw error;
  const map: Record<string, number> = {};
  const mine = new Set<string>();
  for (const p of data || []) {
    const dk = toUTCDateKey(p.created_at);
    map[dk] = (map[dk] || 0) + 1;
    if (me && p.user_id === me.id) {
      mine.add(dk);
    }
  }
  return { counts: map, mine } as CalendarStats;
}
