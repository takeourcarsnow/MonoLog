import { lazy, Suspense } from "react";
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import type { HydratedPost } from '@/lib/types';
import { DEFAULT_AVATAR, mapRowToHydratedPost } from '@/lib/api/utils';
import { resolvePostId } from '@/lib/api/posts/helpers';

// Lazy load the PostView component
const PostView = lazy(() => import("@/app/components/post/PostView").then(mod => ({ default: mod.PostView })));

// Use the shared mapper from lib to keep normalization consistent

// Server-rendered page: resolve slug/short-id to the canonical full post id
// using the server service-role client so direct refreshes work reliably.
export default async function PostIdPage({ params }: { params: any }) {
  // `params` may be a Promise in some Next.js setups; await it to get the real object.
  const { id: raw } = await params;
  // If the route param is missing or not a string, render not-found early
  if (!raw || typeof raw !== 'string') {
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
  // incoming route param
  const sb = getServiceSupabase();

  // Extract trailing token from slug like `username-abcdef12` or use raw
  const { candidateId: candidate } = resolvePostId(raw);

  // Try exact id, then prefix match for short tokens
  // Fetch full post data including user and comments count
  try {
  // candidate used for lookup
    const exact = await sb.from('posts').select('*, users:users(*), comments:comments(id)').eq('id', candidate).limit(1).maybeSingle();
  // exact lookup result checked
    if (exact && !exact.error && exact.data) {
      const post = mapRowToHydratedPost(exact.data);
      return (
        <Suspense>
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
            <Suspense>
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
        <Suspense>
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
