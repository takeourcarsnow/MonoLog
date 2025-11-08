import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { uid } from '@/lib/id';
import { parseMentions } from '@/lib/mentions';
import { parseHashtags } from '@/lib/hashtags';
import { clearServerCachePrefix } from '@/lib/serverCache';

export async function safeInsertPost(sb: any, insertObj: any) {
  let insertData: any = null;
  try {
    const res = await sb.from('posts').insert(insertObj).select('*').limit(1).single();
    if (res.error) {
      // If the error is about missing columns, try without them
      if (res.error.message?.toLowerCase().includes('column') ||
          res.error.message?.toLowerCase().includes('image_urls') ||
          res.error.message?.toLowerCase().includes('camera') ||
          res.error.message?.toLowerCase().includes('lens') ||
          res.error.message?.toLowerCase().includes('film_type') ||
          res.error.message?.toLowerCase().includes('hashtags')) {
        const fallbackObj = { ...insertObj };
        // Remove potentially problematic columns
        delete fallbackObj.image_urls;
        delete fallbackObj.thumbnail_urls;
        if (fallbackObj.spotify_link) delete fallbackObj.spotify_link;
        if (fallbackObj.camera) delete fallbackObj.camera;
        if (fallbackObj.lens) delete fallbackObj.lens;
        if (fallbackObj.film_type) delete fallbackObj.film_type;
        if (fallbackObj.hashtags) delete fallbackObj.hashtags;
        if (fallbackObj.weather_condition) delete fallbackObj.weather_condition;
        if (fallbackObj.weather_temperature) delete fallbackObj.weather_temperature;
        if (fallbackObj.weather_location) delete fallbackObj.weather_location;
        if (fallbackObj.location_latitude) delete fallbackObj.location_latitude;
        if (fallbackObj.location_longitude) delete fallbackObj.location_longitude;
        if (fallbackObj.location_address) delete fallbackObj.location_address;
        const fallbackRes = await sb.from('posts').insert(fallbackObj).select('*').limit(1).single();
        if (fallbackRes.error) {
          throw new Error(`Database schema error: ${fallbackRes.error.message}`);
        }
        insertData = fallbackRes.data;
      } else {
        throw new Error(res.error.message || res.error);
      }
    } else {
      insertData = res.data;
    }
  } catch (e: any) {
    throw new Error(`Database error: ${e?.message || String(e)}`);
  }
  return insertData;
}

export async function processMentions(sb: any, caption: string, postId: string, actorId: string, createdAt: string, deleteExisting: boolean = false) {
  if (!caption) return;

  const mentions = parseMentions(caption);
  if (mentions.length === 0) return;

  (async () => {
    try {
      if (deleteExisting) {
        try {
          await sb.from('post_mentions').delete().eq('post_id', postId);
        } catch (e) {
          // Ignore if table doesn't exist
        }
      }

      // Get user IDs for mentioned usernames
      const { data: mentionedUsers, error: usersErr } = await sb
        .from('users')
        .select('id, username')
        .in('username', mentions);
      if (!usersErr && mentionedUsers) {
        const mentionedUserIds = mentionedUsers.map((u: any) => u.id);
        // Batch insert into post_mentions and notifications
        try {
          const mentionInserts = mentionedUserIds.map((mentionedId: string) => ({
            id: uid(),
            post_id: postId,
            mentioned_user_id: mentionedId,
            created_at: createdAt,
          }));
          const notifInserts = mentionedUserIds.map((mentionedId: string) => ({
            id: uid(),
            user_id: mentionedId,
            actor_id: actorId,
            post_id: postId,
            type: 'mention',
            text: `You were mentioned in a post`,
            created_at: createdAt,
            read: false,
          }));

          // Batch insert mentions
          if (mentionInserts.length > 0) {
            await sb.from('post_mentions').insert(mentionInserts);
          }

          // Batch insert notifications
          if (notifInserts.length > 0) {
            await sb.from('notifications').insert(notifInserts);
          }
        } catch (e) {
          // Ignore if tables don't exist or other errors
        }
      }
    } catch (e) {
      // Ignore mention processing errors
    }
  })();
}

export function processHashtags(caption: string) {
  return parseHashtags(caption || '');
}

export function clearPostCaches(prefixes: string[] = ['explore:', 'following:']) {
  try {
    for (const prefix of prefixes) {
      clearServerCachePrefix(prefix);
    }
  } catch (_) {}
}