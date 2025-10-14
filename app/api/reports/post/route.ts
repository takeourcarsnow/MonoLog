import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { uid } from '@/src/lib/id';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';
import { apiRateLimiter } from '@/src/lib/rateLimiter';

export async function POST(req: Request) {
  try {
    // Rate limiting: moderate limits for reporting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = apiRateLimiter.checkLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      }, {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString()
        }
      });
    }

    const body = await req.json();
    const { postId, reason, details } = body;

    if (!postId || !reason) {
      return NextResponse.json({ error: 'Missing postId or reason' }, { status: 400 });
    }

    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reporterId = authUser.id;

    // Validate reason
    const validReasons = ['spam', 'harassment', 'inappropriate', 'copyright', 'hate_speech', 'other'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
    }

    const sb = getServiceSupabase();

    // Check if post exists
    const { data: post, error: postError } = await sb
      .from('posts')
      .select('id, user_id')
      .eq('id', postId)
      .limit(1)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Don't allow reporting own posts
    if (post.user_id === reporterId) {
      return NextResponse.json({ error: 'Cannot report your own post' }, { status: 400 });
    }

    // Check if already reported by this user
    const { data: existingReport } = await sb
      .from('reports')
      .select('id')
      .eq('post_id', postId)
      .eq('reporter_id', reporterId)
      .limit(1)
      .maybeSingle();

    if (existingReport) {
      return NextResponse.json({ error: 'You have already reported this post' }, { status: 409 });
    }

    // Insert report
    const reportId = uid();
    const { error: insertError } = await sb
      .from('reports')
      .insert({
        id: reportId,
        post_id: postId,
        reporter_id: reporterId,
        reason,
        details: details || null,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (insertError) {
      // If reports table doesn't exist, try to create a notification instead
      if (insertError.message?.includes('relation "reports" does not exist')) {
        // Fallback: create a notification for admins/moderators
        const notifId = uid();
        const { error: notifError } = await sb
          .from('notifications')
          .insert({
            id: notifId,
            user_id: post.user_id, // Notify post owner for now
            actor_id: reporterId,
            post_id: postId,
            type: 'report',
            text: `Post reported for: ${reason}${details ? ` - ${details}` : ''}`,
            created_at: new Date().toISOString(),
            read: false,
          });

        if (notifError) {
          return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
        }

        return NextResponse.json({
          ok: true,
          message: 'Report submitted (notification created)',
          fallback: true
        });
      }

      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, reportId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}