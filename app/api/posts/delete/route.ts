import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const sb = getServiceSupabase();
    // fetch post to delete and its image urls
    const { data: post } = await sb.from('posts').select('*').eq('id', id).limit(1).single();
    if (post) {
      const imageUrls: string[] = [];
      if (post.image_urls && Array.isArray(post.image_urls)) imageUrls.push(...post.image_urls);
      else if (post.image_url) imageUrls.push(post.image_url);
      // remove storage objects that point to posts bucket
      try {
        const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '') + '/storage/v1/object/public/posts/';
        const toRemove: string[] = [];
        for (const u of imageUrls) {
          if (typeof u === 'string' && u.startsWith(base)) {
            toRemove.push(decodeURIComponent(u.slice(base.length)));
          }
        }
        if (toRemove.length) await sb.storage.from('posts').remove(toRemove);
      } catch (e) {
        console.warn('storage removal failed', e);
      }
    }

    // delete comments and post rows
    await sb.from('comments').delete().eq('post_id', id);
    const { error } = await sb.from('posts').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
