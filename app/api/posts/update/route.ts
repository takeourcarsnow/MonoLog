import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { parseMentions } from '@/src/lib/mentions';
import { uid } from '@/src/lib/id';

export async function POST(req: Request) {
  try {
    const { id, patch } = await req.json();
  if (!id || !patch) return NextResponse.json({ error: 'Missing id or patch' }, { status: 400 });
  const CAPTION_MAX = 1000;
  if (patch.caption !== undefined && typeof patch.caption === 'string' && patch.caption.length > CAPTION_MAX) return NextResponse.json({ error: `Caption exceeds ${CAPTION_MAX} characters` }, { status: 400 });
    const sb = getServiceSupabase();
    const updates: any = {};
    if (patch.caption !== undefined) updates.caption = patch.caption;
    if (patch.alt !== undefined) updates.alt = patch.alt;
    if (patch.public !== undefined) updates.public = patch.public;
    if (patch.camera !== undefined) updates.camera = patch.camera;
    if (patch.lens !== undefined) updates.lens = patch.lens;
  if (patch.filmType !== undefined) updates.film_type = patch.filmType === '' ? null : patch.filmType;
  const { data: updatedRows, error } = await sb.from('posts').update(updates).eq('id', id).select('*').limit(1).single();
  if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });

    // Handle mentions if caption was updated
    if (patch.caption) {
      (async () => {
        try {
          // Get post info
          const { data: post, error: postErr } = await sb
            .from('posts')
            .select('user_id')
            .eq('id', id)
            .limit(1)
            .single();
          if (postErr || !post) return;

          // Delete existing mentions
          try {
            await sb.from('post_mentions').delete().eq('post_id', id);
          } catch (e) {
            // Ignore if table doesn't exist
          }

          const mentions = parseMentions(patch.caption);
          if (mentions.length > 0) {
            // Get user IDs for mentioned usernames
            const { data: mentionedUsers, error: usersErr } = await sb
              .from('users')
              .select('id, username')
              .in('username', mentions);
            if (!usersErr && mentionedUsers) {
              const mentionedUserIds = mentionedUsers.map(u => u.id);
              // Insert into post_mentions
              try {
                const mentionInserts = mentionedUserIds.map(mentionedId => ({
                  id: uid(),
                  post_id: id,
                  mentioned_user_id: mentionedId,
                  created_at: new Date().toISOString(),
                }));
                await sb.from('post_mentions').insert(mentionInserts);
              } catch (e) {
                // Ignore if table doesn't exist
              }
              // Create notifications for mentions
              try {
                const notifInserts = mentionedUserIds.map(mentionedId => ({
                  id: uid(),
                  user_id: mentionedId,
                  actor_id: post.user_id,
                  post_id: id,
                  type: 'mention',
                  text: `You were mentioned in a post`,
                  created_at: new Date().toISOString(),
                  read: false,
                }));
                await sb.from('notifications').insert(notifInserts);
              } catch (e) {
                // Ignore notification errors
              }
            }
          }
        } catch (e) {
          // Ignore mention processing errors
        }
      })();
    }

  // Return the updated row to the client to avoid immediate stale reads
  return NextResponse.json({ ok: true, post: updatedRows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
