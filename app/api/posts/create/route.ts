import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { uid } from '@/lib/id';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, imageUrls, caption, alt, replace = false, public: isPublic = true } = body;
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    const sb = getServiceSupabase();

    // If replace is true, delete today's posts for the user first
    if (replace) {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(start.getDate() + 1);
      const { data: todays } = await sb.from('posts').select('*').eq('user_id', userId).gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
      if ((todays || []).length) {
        const ids = (todays || []).map((p: any) => p.id);
        // delete comments
        await sb.from('comments').delete().in('post_id', ids);
        // remove storage objects as best-effort
        try {
          const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '') + '/storage/v1/object/public/posts/';
          const toRemove: string[] = [];
          for (const p of (todays || [])) {
            const existingImageUrls: string[] = [];
            if (p.image_urls && Array.isArray(p.image_urls)) existingImageUrls.push(...p.image_urls);
            else if (p.image_url) existingImageUrls.push(p.image_url);
            for (const u of existingImageUrls) {
              if (typeof u === 'string' && u.startsWith(base)) {
                toRemove.push(decodeURIComponent(u.slice(base.length)));
              }
            }
          }
          if (toRemove.length) await sb.storage.from('posts').remove(toRemove);
        } catch (e) {
          console.warn('storage removal failed', e);
        }
        await sb.from('posts').delete().in('id', ids);
      }
    }

    // Insert new post
    const id = uid();
    const created_at = new Date().toISOString();
    const insertObj: any = { id, user_id: userId, alt: alt || '', caption: caption || '', created_at, public: !!isPublic };
    if (imageUrls && imageUrls.length === 1) insertObj.image_url = imageUrls[0];
    else if (imageUrls && imageUrls.length > 1) insertObj.image_urls = imageUrls;

    const { error, data: insertData } = await sb.from('posts').insert(insertObj).select('*').limit(1).single();
    if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });

    return NextResponse.json({ ok: true, post: insertData });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
