import type { HydratedPost } from "@/src/lib/types";

// Simple in-memory cache for calendar data and loaded image tracking.
// Persists for the lifetime of the page (until reload).

export const statsByMonth: Record<string, { counts: Record<string, number>; mine: string[] }> = {};
export const postsByDate: Record<string, HydratedPost[]> = {};
export const loadedImageUrls: Set<string> = new Set();

export function getStats(key: string) {
  return statsByMonth[key];
}
export function setStats(key: string, data: { counts: Record<string, number>; mine: string[] }) {
  statsByMonth[key] = data;
}

export function getPosts(key: string) {
  return postsByDate[key];
}
export function setPosts(key: string, posts: HydratedPost[]) {
  postsByDate[key] = posts;
}

export function isImageLoaded(url: string) {
  return loadedImageUrls.has(url);
}
export function markImageLoaded(url: string) {
  try { loadedImageUrls.add(url); } catch (e) {}
}

export function anyImageLoaded(urls: string[]) {
  return urls.some(u => loadedImageUrls.has(u));
}
