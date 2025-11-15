import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/lib/api/serverVerifyAuth';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

function mapRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    media_url: row.media_url,
    thumbnail_url: row.thumbnail_url,
    media_type: row.media_type,
    created_at: row.created_at,
    expires_at: row.expires_at,
    view_count: row.view_count,
    viewers: row.viewers || row.viewers_json || [],
    duration_seconds: row.duration_seconds,
  };
}

export async function POST(req: Request) {
  try {
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const mediaUrl = body.mediaUrl as string | undefined;
    const thumbnailUrl = body.thumbnailUrl as string | undefined;
    const mediaType = body.mediaType as 'image' | 'video' | undefined;
    const durationSeconds = body.durationSeconds as number | undefined;
    if (!mediaUrl) return NextResponse.json({ error: 'Missing mediaUrl' }, { status: 400 });
    if (!mediaType) return NextResponse.json({ error: 'Missing mediaType' }, { status: 400 });
    if (!['image','video'].includes(mediaType)) return NextResponse.json({ error: 'Invalid mediaType' }, { status: 400 });

    const sb = getServiceSupabase();
    // Compute expires_at (24h from now)
    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const insert: any = {
      user_id: authUser.id,
      media_url: mediaUrl,
      thumbnail_url: thumbnailUrl || null,
      media_type: mediaType,
      created_at: now.toISOString(),
      expires_at: expires.toISOString(),
      duration_seconds: durationSeconds || null,
    };
    // Insert row into stories table
    const { data, error } = await sb.from('stories').insert(insert).select('*').limit(1).single();
    if (error) {
      // Provide actionable hint when table missing
      const msg = (error as any).message || String(error);
      if (/relation .*stories/i.test(msg) || /table .*stories/i.test(msg)) {
        return NextResponse.json({ error: 'Stories table missing. Create a table "stories" with columns: id uuid default uuid_generate_v4() primary key, user_id uuid not null, media_url text not null, thumbnail_url text, media_type text not null, created_at timestamptz default now(), expires_at timestamptz not null, view_count int default 0, viewers_json jsonb, duration_seconds int. Also add an index on (user_id, expires_at).'}, { status: 500 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json({ ok: true, story: mapRow(data) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
