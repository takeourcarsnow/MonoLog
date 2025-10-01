import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';

export async function POST(req: Request) {
  try {
    const { userId, dataUrl, filename } = await req.json();
    if (!userId || !dataUrl) return NextResponse.json({ error: 'Missing userId or dataUrl' }, { status: 400 });
    // dataUrl: data:<mime>;base64,<b64>
    const m = /^data:(.+);base64,(.*)$/.exec(dataUrl);
    if (!m) return NextResponse.json({ error: 'Invalid dataUrl' }, { status: 400 });
    const mime = m[1];
    const b64 = m[2];
    const buf = Buffer.from(b64, 'base64');
    const name = filename || `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const path = `${userId}/${name}`;
    const sb = getServiceSupabase();
    // CRITICAL: When using service role, explicitly set the owner metadata so RLS policies work correctly
    const { data, error } = await sb.storage.from('posts').upload(path, buf, { 
      upsert: true, 
      contentType: mime as any,
      metadata: { owner: userId }  // Set owner explicitly for RLS policies
    });
    if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
    const { data: urlData } = sb.storage.from('posts').getPublicUrl(path);
    return NextResponse.json({ ok: true, publicUrl: urlData.publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
