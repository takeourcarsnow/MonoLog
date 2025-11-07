import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/lib/api/serverVerifyAuth';

// Minimal video upload handler. Accepts a base64 dataUrl (e.g. data:video/mp4;base64,...) and stores it.
// For production, replace with a multipart/form-data + proper transcoding (ffmpeg) pipeline.
// Returns publicUrl and (placeholder) thumbnailUrl (same as publicUrl until thumbnail extraction added).
export async function POST(req: Request) {
  try {
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const dataUrl = body.dataUrl as string | undefined;
    let filename = body.filename as string | undefined;
    if (!dataUrl) return NextResponse.json({ error: 'Missing dataUrl' }, { status: 400 });
    const m = /^data:(.+);base64,(.*)$/.exec(dataUrl);
    if (!m) return NextResponse.json({ error: 'Invalid dataUrl' }, { status: 400 });
    const mime = m[1];
    const b64 = m[2];
    if (!/^video\//.test(mime)) return NextResponse.json({ error: 'Expected video/* mime type' }, { status: 400 });
    const buf = Buffer.from(b64, 'base64');
    // Naive size guard (e.g. 15MB)
    const maxBytes = 15 * 1024 * 1024;
    if (buf.length > maxBytes) return NextResponse.json({ error: 'Video too large (max 15MB for inline data upload)' }, { status: 413 });
    if (filename) filename = filename.replace(/.*[\\/]/, '').slice(0, 240);
    const ext = mime === 'video/webm' ? '.webm' : '.mp4';
    const name = filename ? filename.replace(/\.[^.]+$/, ext) : `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    const path = `${authUser.id}/videos/${name}`;
    const sb = getServiceSupabase();
    const { error } = await sb.storage.from('posts').upload(path, buf, { upsert: true, contentType: mime, cacheControl: 'public, max-age=86400' });
    if (error) return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/posts/`;
    const publicUrl = `${baseUrl}${path}`;
    return NextResponse.json({ ok: true, publicUrl, thumbnailUrl: publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
