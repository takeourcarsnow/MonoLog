import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';
import sharp from 'sharp';

async function generateThumbnail(imageBuffer: Buffer, mime: string): Promise<Buffer> {
  try {
    // Generate thumbnail with max 1000px edge (sweet spot for quality vs performance), maintaining aspect ratio
    const thumbnail = await sharp(imageBuffer)
      .resize(1000, 1000, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    return thumbnail;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    // Fallback: return original buffer if thumbnail generation fails
    return imageBuffer;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const dataUrl = body.dataUrl;
    let filename = body.filename;
    if (!dataUrl) return NextResponse.json({ error: 'Missing dataUrl' }, { status: 400 });
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = authUser.id;
    // dataUrl: data:<mime>;base64,<b64>
    const m = /^data:(.+);base64,(.*)$/.exec(dataUrl);
    if (!m) return NextResponse.json({ error: 'Invalid dataUrl' }, { status: 400 });
    const mime = m[1];
    const b64 = m[2];
    const buf = Buffer.from(b64, 'base64');
  // Basic filename sanitization: strip path segments and limit length
  if (filename) filename = filename.replace(/.*[\\/]/, '').slice(0, 240);
  const name = filename || `${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const path = `${userId}/${name}`;
    const sb = getServiceSupabase();
    
    // Generate thumbnail
    const thumbBuf = await generateThumbnail(buf, mime);
    const thumbName = name.replace(/\.[^.]+$/, '_thumb.jpg');
    const thumbPath = `${userId}/${thumbName}`;
    
    // Upload both full image and thumbnail
    const uploadPromises = [
      sb.storage.from('posts').upload(path, buf, { 
        upsert: true, 
        contentType: mime as any
      }),
      sb.storage.from('posts').upload(thumbPath, thumbBuf, {
        upsert: true,
        contentType: 'image/jpeg'
      })
    ];
    
    const [fullResult, thumbResult] = await Promise.all(uploadPromises);
    
    if (fullResult.error) return NextResponse.json({ error: fullResult.error.message || fullResult.error }, { status: 500 });
    if (thumbResult.error) return NextResponse.json({ error: thumbResult.error.message || thumbResult.error }, { status: 500 });
    
    // Generate public URLs
    const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/posts/`;
    const publicUrl = `${baseUrl}${path}`;
    const thumbnailUrl = `${baseUrl}${thumbPath}`;
    
    return NextResponse.json({ 
      ok: true, 
      publicUrl,
      thumbnailUrl
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
