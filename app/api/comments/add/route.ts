import { NextResponse } from 'next/server';
import { getServiceSupabase, getUserSupabase } from '@/src/lib/api/serverSupabase';
import { uid } from '@/src/lib/id';
import { getUserFromAuthHeader, getTokenFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';
import { checkComment } from '@/src/lib/moderation';
import { apiRateLimiter } from '@/src/lib/rateLimiter';
import { extractUserProfile } from '@/src/lib/api/userProfile';
import { checkRateLimitResponse, getClientIp } from '@/src/lib/api/utils';
import { apiError, apiSuccess } from '@/lib/apiResponse';
import { parseMentions } from '@/src/lib/mentions';

function extractUserProfileFromAuth(authUser: any) {
  return extractUserProfile(authUser);
}

export async function POST(req: Request) {
  try {
    // Rate limiting: moderate limits for comment creation
    const ip = getClientIp(req);
    const rateLimitRes = checkRateLimitResponse(apiRateLimiter, ip, true);
    if (rateLimitRes) return rateLimitRes;

    const body = await req.json();
    const postId = body.postId;
    const text = body.text;
    const parentId = body.parentId;
    if (!postId || !text) return apiError('Missing postId or text', 400);
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return apiError('Unauthorized', 401);
    const actorId = authUser.id;
    const token = getTokenFromAuthHeader(req);
    if (!token) return apiError('Unauthorized', 401);
    const userSb = await getUserSupabase(token);
    const sb = getServiceSupabase();
    const COMMENT_MAX = 500;
    if (typeof text === 'string' && text.trim().length > COMMENT_MAX) return apiError(`Comment exceeds ${COMMENT_MAX} characters`, 400);
    // run automod checks
    try {
      const mod = checkComment(String(text));
      if (mod.action === 'reject') {
        return apiError('Comment rejected by moderation', 400, { reasons: mod.reasons, score: mod.score });
      }
      if (mod.action === 'flag') {
        // For now treat flagged comments as rejected; alternatively we could
        // insert with a 'flagged' column or moderation queue. This is a
        // conservative default to avoid posting spam/links immediately.
        return apiError('Comment flagged by moderation', 400, { reasons: mod.reasons, score: mod.score });
      }
    } catch (e) {
      // If moderation util throws for unexpected reason, allow the comment
      // to avoid blocking users. Moderation should be best-effort.
    }

  const id = uid();
    const created_at = new Date().toISOString();
    // Ensure a minimal profile exists for the actor so the comment list
    // can join a users row and show a username/displayName instead of a generic fallback.
    try {
      // Don't clobber an existing profile. If a users row already exists, skip upsert.
      const { data: existing, error: existErr } = await sb.from('users').select('id,username,display_name,avatar_url').eq('id', actorId).limit(1).maybeSingle();
      if (!existErr && existing) {
        // we already have a profile row; leave it alone
      } else {
        // Try to enrich profile from Auth user metadata when available
        let username = String(actorId).slice(0, 8);
        let displayName = 'User';
        let avatarUrl: string | undefined = undefined;
        try {
          // admin.getUserById is available when using service role client; shape may vary
          const maybe = await (sb as any).auth?.admin?.getUserById?.(actorId);
          const authUser = maybe?.data?.user || maybe?.data || null;
          if (authUser) {
            const profile = extractUserProfileFromAuth(authUser);
            username = profile.username;
            displayName = profile.displayName;
            avatarUrl = profile.avatarUrl;
          }
        } catch (e) {
          // ignore admin fetch errors
        }

        const up: any = { id: actorId, username, display_name: null };
        if (avatarUrl) up.avatar_url = avatarUrl;
        // only create the minimal profile when missing. Use insert rather
        // than upsert to avoid overwriting an existing row if the earlier
        // select failed due to schema cache issues.
        try { await sb.from('users').insert(up); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      // ignore
    }

    // Insert using the correct snake_case column names that match the database schema
    let insertData: { id: string; post_id: string; user_id: string; text: string; created_at: string; parent_id?: string } = { id, post_id: postId, user_id: actorId, text: text.trim(), created_at };
    if (parentId) insertData.parent_id = parentId;
    
    console.log('Inserting comment:', insertData);
    const res = await sb.from('comments').insert(insertData);
    console.log('Insert result:', res);
    if (res.error) {
      console.log('Insert error:', res.error);
      return apiError(String(res.error.message || res.error), 500);
    }
    // Try to create a notification for the post owner and all previous commenters. This is best-effort
    // — if the notifications table doesn't exist or the insert fails, we
    // shouldn't block comment creation.
    (async () => {
      try {
        // lookup post owner
        const { data: post, error: postErr } = await sb.from('posts').select('id, user_id').eq('id', postId).limit(1).single();
        if (!post || postErr) {
          console.log('[addComment] Post lookup failed:', postErr);
          return;
        }
        // get all previous commenters except actor
        const { data: prevComments, error: commErr } = await sb.from('comments').select('user_id').eq('post_id', postId).neq('user_id', actorId);
        const notifyUsers = new Set<string>();
        notifyUsers.add(post.user_id); // always notify post owner
        if (!commErr && prevComments) {
          for (const c of prevComments) {
            notifyUsers.add(c.user_id);
          }
        }
        // remove actor if somehow included
        notifyUsers.delete(actorId);
        console.log('[addComment] Notifying users:', Array.from(notifyUsers), 'for post:', postId, 'actor:', actorId);
        for (const userId of notifyUsers) {
          const notifId = uid();
          const notif = {
            id: notifId,
            user_id: userId,
            actor_id: actorId,
            post_id: postId,
            type: 'comment',
            text: text.trim().slice(0, 240),
            created_at,
            read: false,
          } as any;
          console.log('[addComment] Inserting notification for user:', userId, notif);
          const insertResult = await sb.from('notifications').insert(notif);
          if (insertResult.error) {
            console.log('[addComment] Notification insert error for user:', userId, insertResult.error);
          } else {
            console.log('[addComment] Notification created for user:', userId);
          }
        }
      } catch (e) {
        console.log('[addComment] Notification creation error:', e);
        // ignore notification errors
      }
    })();

    // Process mentions in comment text
    (async () => {
      try {
        const mentions = parseMentions(text.trim());
        if (mentions.length > 0) {
          // Get user IDs for mentioned usernames
          const { data: mentionedUsers, error: usersErr } = await sb
            .from('users')
            .select('id, username')
            .in('username', mentions);
          if (!usersErr && mentionedUsers) {
            const mentionedUserIds = mentionedUsers.map((u: any) => u.id);
            // Create notifications for mentions
            const notifInserts = mentionedUserIds.map((mentionedId: string) => ({
              id: uid(),
              user_id: mentionedId,
              actor_id: actorId,
              post_id: postId,
              type: 'mention',
              text: `You were mentioned in a comment`,
              created_at,
              read: false,
            }));

            if (notifInserts.length > 0) {
              await sb.from('notifications').insert(notifInserts);
            }
          }
        }
      } catch (e) {
        console.log('[addComment] Mention processing error:', e);
        // ignore mention processing errors
      }
    })();

    return apiSuccess({ ok: true, id, created_at });
  } catch (e: any) {
    return apiError(e?.message || String(e), 500);
  }
}
