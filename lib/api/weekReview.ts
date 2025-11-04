import type { WeekReviewStats } from "../types";
import { getClient, ensureAuthListener } from "./client";

export async function weekReviewStats(): Promise<WeekReviewStats> {
  const sb = getClient();
  ensureAuthListener(sb);

  // Get the current session to include the access token
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No active session');
  }

  const response = await fetch('/api/week-review', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch week review stats');
  }

  return response.json();
}