import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';

function normalizeImageUrls(raw: any): string[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch (e) {
      // fall through
    }
    return [raw];
  }
  try {
    const maybe = Array.from(raw as any);
    if (Array.isArray(maybe)) return maybe.map(String);
  } catch (e) {
    // ignore
  }
  return [String(raw)];
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const sb = getServiceSupabase();

    // Try exact id, then prefix match if short
    const dashIdx = id.lastIndexOf('-');
    let candidateId = id;
    if (dashIdx > 0) {
      const trailing = id.slice(dashIdx + 1);
      if (/^[0-9a-fA-F]{6,}$/.test(trailing)) candidateId = trailing;
    }

    let res: any = await sb.from('posts').select('*').eq('id', candidateId).limit(1).maybeSingle();
    if (!res.error && res.data) {
      const row = res.data;
      const raw = row.image_urls ?? row.image_urls_json ?? row.image_urls_jsonb ?? row.image_url ?? row.imageUrl ?? undefined;
      const normalized = normalizeImageUrls(raw);
      return NextResponse.json({ foundBy: 'exact', rawRow: row, normalized }, { status: 200 });
    }

    if (candidateId.length <= 12) {
      const prefRes: any = await sb.from('posts').select('*').ilike('id', `${candidateId}%`).limit(1).maybeSingle();
      if (!prefRes.error && prefRes.data) {
        const row = prefRes.data;
        const raw = row.image_urls ?? row.image_urls_json ?? row.image_urls_jsonb ?? row.image_url ?? row.imageUrl ?? undefined;
        const normalized = normalizeImageUrls(raw);
        return NextResponse.json({ foundBy: 'prefix', rawRow: row, normalized }, { status: 200 });
      }
    }

    // try raw exact
    const rawRes: any = await sb.from('posts').select('*').eq('id', id).limit(1).maybeSingle();
    if (!rawRes.error && rawRes.data) {
      const row = rawRes.data;
      const raw = row.image_urls ?? row.image_urls_json ?? row.image_urls_jsonb ?? row.image_url ?? row.imageUrl ?? undefined;
      const normalized = normalizeImageUrls(raw);
      return NextResponse.json({ foundBy: 'raw', rawRow: row, normalized }, { status: 200 });
    }

    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
