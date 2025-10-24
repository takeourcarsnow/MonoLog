import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { mapRowToHydratedPost } from '@/src/lib/api/utils';
import { getServerCache, setServerCache } from '@/src/lib/serverCache';

export async function GET(req: Request, { params }: { params: { tag: string } }) {
  try {
    const tag = params.tag?.toLowerCase();
    if (!tag || tag.trim() === '') {
      return NextResponse.json({ error: 'Valid tag required' }, { status: 400 });
    }

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || '10') || 10, 50); // cap at 50
    const before = url.searchParams.get('before') || undefined;

    const sb = getServiceSupabase();

    const cacheKey = `hashtag:${tag}:limit=${limit}:before=${before || 'none'}`;
    const cached = getServerCache(cacheKey);
    if (cached) {
      return NextResponse.json({ ok: true, posts: cached });
    }

    let q: any = sb.from('posts').select('*, users!left(id, username, display_name, avatar_url), public_profiles!left(id, username, display_name, avatar_url)').eq('public', true).contains('hashtags', [tag]).order('created_at', { ascending: false }).limit(limit);

    if (before) q = q.lt('created_at', before);

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message || error }, { status: 500 });
    }

    const rows = (data || []).map((r: any) => mapRowToHydratedPost(r));
    // Cache the result
    try { setServerCache(cacheKey, rows, 10000); } catch (_) {}
    return NextResponse.json({ ok: true, posts: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}