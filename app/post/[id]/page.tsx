import { lazy, Suspense } from "react";
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import type { HydratedPost } from '@/src/lib/types';

// Lazy load the PostView component
const PostView = lazy(() => import("@/app/components/PostView").then(mod => ({ default: mod.PostView })));

// Helper to map database row to HydratedPost
function mapRowToHydratedPost(row: any): HydratedPost {
  // Normalize imageUrls into a predictable array shape
  const raw = row.image_urls ?? row.image_urls_json ?? row.image_urls_jsonb ?? undefined;
  let imageUrls: string[] | undefined = undefined;
  if (raw !== undefined && raw !== null) {
    if (Array.isArray(raw)) imageUrls = raw.map(String);
    else if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) imageUrls = parsed.map(String);
        else imageUrls = [raw];
      } catch (e) {
        imageUrls = [raw];
      }
    } else {
      try {
        const maybe = Array.from(raw as any);
        if (Array.isArray(maybe)) imageUrls = maybe.map(String);
        else imageUrls = [String(raw)];
      } catch (e) {
        imageUrls = [String(raw)];
      }
    }
  }

  return {
    id: row.id,
    userId: row.user_id || row.userId,
    imageUrls,
    alt: row.alt,
    caption: row.caption || '',
    createdAt: row.created_at || row.createdAt,
    public: row.public ?? true,
    user: {
      id: row.users?.id || row.user_id,
      username: row.users?.username || '',
      displayName: row.users?.display_name || row.users?.displayName || '',
      avatarUrl: row.users?.avatar_url || row.users?.avatarUrl || '',
    },
    commentsCount: Array.isArray(row.comments) ? row.comments.length : 0,
  };
}

// Server-rendered page: resolve slug/short-id to the canonical full post id
// using the server service-role client so direct refreshes work reliably.
export default async function PostIdPage({ params }: { params: { id: string } }) {
  const raw = params.id;
  // incoming route param
  const sb = getServiceSupabase();

  // Extract trailing token from slug like `username-abcdef12` or use raw
  let candidate = raw;
  const dash = raw.lastIndexOf('-');
  if (dash > 0) {
    const trailing = raw.slice(dash + 1);
    if (/^[0-9a-fA-F]{6,}$/.test(trailing)) candidate = trailing;
  }

  // Try exact id, then prefix match for short tokens
  // Fetch full post data including user and comments count
  try {
  // candidate used for lookup
    const exact = await sb.from('posts').select('*, users:users(*), comments:comments(id)').eq('id', candidate).limit(1).maybeSingle();
  // exact lookup result checked
    if (exact && !exact.error && exact.data) {
      const post = mapRowToHydratedPost(exact.data);
      return (
        <Suspense fallback={<div className="card skeleton" style={{ height: 400 }} />}>
          <PostView id={post.id} initialPost={post} />
        </Suspense>
      );
    }
    if (candidate.length <= 12) {
      try {
        const pref = await sb.from('posts').select('*, users:users(*), comments:comments(id)').ilike('id', `${candidate}%`).limit(1).maybeSingle();
        if (pref && !pref.error && pref.data) {
          const post = mapRowToHydratedPost(pref.data);
          return (
            <Suspense fallback={<div className="card skeleton" style={{ height: 400 }} />}>
              <PostView id={post.id} initialPost={post} />
            </Suspense>
          );
        }
      } catch (e) {
        // ignore and fallthrough to not-found
      }
    }
    // final try: exact match on raw param
    const rawRes = await sb.from('posts').select('*, users:users(*), comments:comments(id)').eq('id', raw).limit(1).maybeSingle();
    if (rawRes && !rawRes.error && rawRes.data) {
      const post = mapRowToHydratedPost(rawRes.data);
      return (
        <Suspense fallback={<div className="card skeleton" style={{ height: 400 }} />}>
          <PostView id={post.id} initialPost={post} />
        </Suspense>
      );
    }
  } catch (e) {
    // swallow and show not-found below
  }

  // Not found - render a simple not-found view (client PostView shows the same message)
  return (
    <div className="post-view-wrap view-fade">
      <div className="toolbar">
        <a className="btn" href="/explore" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Back</span>
        </a>
      </div>
      <div className="empty">Post not found.</div>
    </div>
  );
}
