import { NextResponse } from 'next/server';
import { withHandler } from '@/lib/api/withHandler';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { processMentions, processHashtags, clearPostCaches } from '@/lib/postUtils';
import { updatePostSchema } from '@/lib/validation';

// Config for field mappings: key in patch -> db column -> transform function
const fieldMappings: Record<string, { dbKey: string; transform?: (value: any) => any }> = {
  caption: { dbKey: 'caption' },
  alt: { dbKey: 'alt' },
  public: { dbKey: 'public' },
  camera: { dbKey: 'camera' },
  lens: { dbKey: 'lens' },
  filmType: { dbKey: 'film_type', transform: (v: string) => v === '' ? null : v },
  spotifyLink: { dbKey: 'spotify_link', transform: (v: string) => v === '' ? null : v },
  weatherCondition: { dbKey: 'weather_condition', transform: (v: string) => v === '' ? null : v },
  weatherTemperature: { dbKey: 'weather_temperature' },
  locationAddress: { dbKey: 'location_address', transform: (v: string) => v === '' ? null : v },
};

export const POST = withHandler({ method: 'POST', bodySchema: updatePostSchema, authRequired: true })(async (req, ctx: any) => {
  const { id, patch } = ctx.body;
  const userId = ctx.user.id;
  const sb = getServiceSupabase();
  const updates: any = {};

  // Dynamically apply field updates
  for (const [key, config] of Object.entries(fieldMappings)) {
    if (patch[key] !== undefined) {
      updates[config.dbKey] = config.transform ? config.transform(patch[key]) : patch[key];
    }
  }

  // Special handling for imageUrls: update both image_url and image_urls
  if (patch.imageUrls !== undefined) {
    if (patch.imageUrls.length > 0) {
      updates.image_url = patch.imageUrls[0];
      if (patch.imageUrls.length > 1) {
        updates.image_urls = patch.imageUrls;
      } else {
        updates.image_urls = null; // Clear array if only one image
      }
    } else {
      updates.image_url = null;
      updates.image_urls = null;
    }
  }

  // Special handling for thumbnailUrls: update both thumbnail_url and thumbnail_urls
  if (patch.thumbnailUrls !== undefined) {
    if (patch.thumbnailUrls.length > 0) {
      updates.thumbnail_url = patch.thumbnailUrls[0];
      if (patch.thumbnailUrls.length > 1) {
        updates.thumbnail_urls = patch.thumbnailUrls;
      } else {
        updates.thumbnail_urls = null; // Clear array if only one thumbnail
      }
    } else {
      updates.thumbnail_url = null;
      updates.thumbnail_urls = null;
    }
  }
  // Return the updated post row along with the related user/profile fields
  // so the client can hydrate the post.user properly (username, avatar).
  const { data: updatedRows, error } = await sb
    .from('posts')
    .update(updates)
    .eq('id', id)
    .select('*, users(id, username, display_name, avatar_url)')
    .limit(1)
    .single();
  if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });

  // Handle mentions if caption was updated
  if (patch.caption) {
    const { data: postData } = await sb.from('posts').select('user_id').eq('id', id).limit(1).single();
    if (postData) {
      processMentions(sb, patch.caption, id, postData.user_id, new Date().toISOString(), true);
    }
  }

  // Invalidate feed caches so updates propagate quickly
  clearPostCaches(['explore:', 'following:', 'hashtag:']);

  // Return the updated row to the client to avoid immediate stale reads
  return NextResponse.json({ ok: true, post: updatedRows });
});