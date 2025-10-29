import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';

function normalizeImageUrls(raw: any): string[] | undefined {
  if (raw == null) return undefined;

  // If already an array of strings, return as is
  if (Array.isArray(raw)) return raw.map(String);

  // If string, try parsing as JSON array
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // Not JSON, treat as single URL
    }
    return [raw];
  }

  // Try converting to array
  try {
    const maybe = Array.from(raw);
    if (Array.isArray(maybe)) return maybe.map(String);
  } catch {
    // Not iterable
  }

  // Fallback to string
  return [String(raw)];
}

async function queryPostWithFallback(sb: any, id: string) {
  // Try exact id, then prefix match if short
  const dashIdx = id.lastIndexOf('-');
  let candidateId = id;
  if (dashIdx > 0) {
    const trailing = id.slice(dashIdx + 1);
    if (/^[0-9a-fA-F]{6,}$/.test(trailing)) candidateId = trailing;
  }

  // Attempt 1: Exact match on candidateId
  let res = await sb.from('posts').select('*').eq('id', candidateId).limit(1).maybeSingle();
  if (!res.error && res.data) {
    return { foundBy: 'exact', row: res.data };
  }

  // Attempt 2: Prefix match if short
  if (candidateId.length <= 12) {
    res = await sb.from('posts').select('*').ilike('id', `${candidateId}%`).limit(1).maybeSingle();
    if (!res.error && res.data) {
      return { foundBy: 'prefix', row: res.data };
    }
  }

  // Attempt 3: Raw exact match
  res = await sb.from('posts').select('*').eq('id', id).limit(1).maybeSingle();
  if (!res.error && res.data) {
    return { foundBy: 'raw', row: res.data };
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const secret = req.headers.get('x-debug-secret') || null;
    const allowed = process.env.NODE_ENV !== 'production' || (process.env.DEBUG_SECRET && secret === process.env.DEBUG_SECRET);
    if (!allowed) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const sb = getServiceSupabase();

    const result = await queryPostWithFallback(sb, id);
    if (result) {
      const { foundBy, row } = result;
      const raw = row.image_urls ?? row.image_urls_json ?? row.image_urls_jsonb ?? row.image_url ?? row.imageUrl ?? undefined;
      const normalized = normalizeImageUrls(raw);
      return NextResponse.json({ foundBy, rawRow: row, normalized }, { status: 200 });
    }

    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
