import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { apiError, apiSuccess } from '@/lib/apiResponse';
import { getClientIp, makeWeakETag } from '@/src/lib/api/utils';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const postId = url.searchParams.get('postId');
    if (!postId) return apiError('Missing postId', 400);
    // light per-IP caching header only; comments are public
    const ip = getClientIp(req);

    const sb = getServiceSupabase();

    // Query comments with user info, allowing public read
    const { data, error } = await sb.from('comments').select('*, users!left(*)').eq('post_id', postId).order('created_at', { ascending: true });
    if (error) return apiError(String(error.message || error), 500);

    const comments = (data || []) as any[];

    // If the related users join returned null, fetch user rows by id
    const missingUsers = comments.filter(c => !c.users).map(c => c.user_id).filter(Boolean);
    let userMap: Record<string, any> = {};
    if (missingUsers.length) {
      try {
        const uniq = Array.from(new Set(missingUsers));
        const { data: usersData, error: usersErr } = await sb.from('users').select('*').in('id', uniq);
        if (!usersErr && usersData) {
          for (const u of usersData) userMap[u.id] = u;
        }
      } catch (e) {
        // ignore
      }
    }

    const result = comments.map((c: any) => {
      const urow = c.users || userMap[c.user_id] || null;
      return {
        id: c.id,
        postId: c.post_id,
        userId: c.user_id,
        text: c.text,
        createdAt: c.created_at,
        parentId: c.parent_id || undefined,
        user: {
          id: urow?.id || c.user_id,
          username: urow?.username || urow?.user_name || '',
          displayName: urow?.display_name || urow?.displayName || urow?.username || urow?.user_name || '',
          avatarUrl: urow?.avatar_url || urow?.avatarUrl || '/logo.svg',
        }
      };
    });

    // Prepare caching headers and ETag to help clients avoid re-downloading unchanged lists briefly
    const etag = makeWeakETag(result);
    const clientEtag = req.headers.get('if-none-match');
    const headers: HeadersInit = { ETag: etag };
    const cacheSeconds = 30; // allow short-lived caching
    if (clientEtag && clientEtag === etag) {
      const h = new Headers(headers);
      h.set('Cache-Control', `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`);
      return new NextResponse(null as any, { status: 304, headers: h });
    }
    return apiSuccess(result, 200, { headers, cacheSeconds });
  } catch (e: any) {
    return apiError(e?.message || String(e), 500);
  }
}