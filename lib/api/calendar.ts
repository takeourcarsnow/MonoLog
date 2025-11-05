import type { CalendarStats } from "../types";
import { getClient, ensureAuthListener, getCachedAuthUser } from "./client";

// Build a YYYY-MM-DD key in a specific IANA timezone using Intl formatter parts
function dateKeyInTimeZone(d: Date, timeZone: string): string {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = fmt.formatToParts(d);
    const y = parts.find(p => p.type === "year")?.value ?? String(d.getFullYear());
    const m = parts.find(p => p.type === "month")?.value ?? String(d.getMonth() + 1).padStart(2, "0");
    const day = parts.find(p => p.type === "day")?.value ?? String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    // Fallback to local timezone if Intl fails (should be rare)
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
}

export async function calendarStats({ year, monthIdx, timeZone }: { year: number; monthIdx: number; timeZone: string }) {
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
    const created = new Date(p.created_at);
    // Derive the user's local calendar date using the supplied IANA timezone
    const dk = dateKeyInTimeZone(created, timeZone);
    map[dk] = (map[dk] || 0) + 1;
    if (me && p.user_id === me.id) {
      mine.add(dk);
    }
  }
  return { counts: map, mine: Array.from(mine) } as CalendarStats;
}
