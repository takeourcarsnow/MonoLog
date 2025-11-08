import { NextResponse } from 'next/server';
import { withHandler } from '@/lib/api/withHandler';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { clearServerCachePrefix } from '@/lib/serverCache';
import { z } from 'zod';

const deletePostSchema = z.object({
  id: z.string(),
});

export const POST = withHandler({ method: 'POST', bodySchema: deletePostSchema, authRequired: true })(async (req, ctx: any) => {
  const { id } = ctx.body;
  const userId = ctx.user.id;
  const sb = getServiceSupabase();

  // fetch post to delete and its image urls
  const { data: post } = await sb.from('posts').select('*').eq('id', id).limit(1).single();
  if (post) {
    // ensure the authenticated user owns the post or is an admin (service role users not allowed via this endpoint)
    if (String(post.user_id) !== String(userId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const allUrls: string[] = [];
    if (post.image_urls && Array.isArray(post.image_urls)) allUrls.push(...post.image_urls);
    else if (post.image_url) allUrls.push(post.image_url);
    if (post.thumbnail_urls && Array.isArray(post.thumbnail_urls)) allUrls.push(...post.thumbnail_urls);
    else if (post.thumbnail_url) allUrls.push(post.thumbnail_url);
    // remove storage objects that point to posts bucket
    try {
      const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '') + '/storage/v1/object/public/posts/';
      const toRemove: string[] = [];
      for (const u of allUrls) {
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

  // Invalidate feed caches so deletions propagate quickly
  try { clearServerCachePrefix('explore:'); clearServerCachePrefix('following:'); } catch (_) {}

  return NextResponse.json({ ok: true });
});
