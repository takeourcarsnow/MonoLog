import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { mapRowToHydratedPost } from '@/lib/api/utils';
import { SELECT_POST_WITH_PROFILES } from '@/lib/api/sql';

export async function GET(req: Request) {
  try {
    const sb = getServiceSupabase();

    // Query posts with non-null spotify_link
    const { data, error } = await sb
      .from('posts')
      .select(SELECT_POST_WITH_PROFILES)
      .not('spotify_link', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message || error }, { status: 500 });
    }

    const posts = (data || []).map((r: any) => mapRowToHydratedPost(r));

    // Extract Spotify tracks info
    const spotifyTracks = posts.map(post => ({
      postId: post.id,
      spotifyLink: post.spotifyLink,
      user: {
        id: post.user.id,
        username: post.user.username,
        displayName: post.user.displayName,
      },
      createdAt: post.createdAt,
    }));

    return NextResponse.json({ ok: true, tracks: spotifyTracks });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}