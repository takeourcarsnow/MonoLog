import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';

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

    // Resolve id similar to the debug GET: accept full id or slugs like username-<shortid>
    let row: any = null;
    try {
      // Try exact match on provided id first
      let tryRes: any = await sb.from('posts').select('*').eq('id', id).limit(1).maybeSingle();
      if (!tryRes.error && tryRes.data) {
        row = tryRes.data;
      } else {
        // If id looks like a slug (username-<short>), extract trailing token and try prefix match
        const dashIdx = id.lastIndexOf('-');
        let candidateId = id;
        if (dashIdx > 0) {
          const trailing = id.slice(dashIdx + 1);
          if (/^[0-9a-fA-F]{6,}$/.test(trailing)) candidateId = trailing;
        }
        // Try exact match on candidateId
        tryRes = await sb.from('posts').select('*').eq('id', candidateId).limit(1).maybeSingle();
        if (!tryRes.error && tryRes.data) {
          row = tryRes.data;
        } else if (candidateId.length <= 12) {
          // Try prefix match
          const prefRes: any = await sb.from('posts').select('*').ilike('id', `${candidateId}%`).limit(1).maybeSingle();
          if (!prefRes.error && prefRes.data) row = prefRes.data;
        }
      }
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }
    if (!row) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    const raw = row.image_urls ?? row.image_urls_json ?? row.image_urls_jsonb ?? row.image_url ?? row.imageUrl ?? undefined;
    const normalized = normalizeImageUrls(raw);
    // If already an array with length > 1, nothing to do
    if (Array.isArray(normalized) && normalized.length > 1) {
      return NextResponse.json({ ok: true, message: 'Already multi-image', rawRow: row, normalized }, { status: 200 });
    }

    // If we only have a single image_url, convert it to an array and persist
  const primary = row.image_url || row.imageUrl;
    if (!primary) return NextResponse.json({ error: 'No primary imageUrl to convert' }, { status: 400 });
    const arr = [String(primary)];

    // Try to update the array column
    try {
      const upd: any = { image_urls: arr };
      const ures: any = await sb.from('posts').update(upd).eq('id', id).select('*').limit(1).single();
      if (!ures.error && ures.data) {
        const newRow = ures.data;
        const newRaw = newRow.image_urls ?? newRow.image_urls_json ?? newRow.image_urls_jsonb ?? newRow.image_url ?? newRow.imageUrl;
        return NextResponse.json({ ok: true, updatedBy: 'image_urls', rawRow: newRow, normalized: normalizeImageUrls(newRaw) }, { status: 200 });
      }
    } catch (e) {
      // ignore and try fallbacks
    }

    // Try JSON fallback columns
    const tryNames = ['image_urls_json', 'image_urls_jsonb'];
    for (const name of tryNames) {
      try {
        const payload: any = {};
        // write as an actual array so json/jsonb columns receive array values
        payload[name] = arr;
        const r2: any = await sb.from('posts').update(payload).eq('id', id).select('*').limit(1).single();
        if (!r2.error && r2.data) {
          const newRow = r2.data;
          const newRaw = newRow.image_urls ?? newRow.image_urls_json ?? newRow.image_urls_jsonb ?? newRow.image_url ?? newRow.imageUrl;
          return NextResponse.json({ ok: true, updatedBy: name, rawRow: newRow, normalized: normalizeImageUrls(newRaw) }, { status: 200 });
        }
      } catch (e) {
        // ignore and try next
      }
    }

    return NextResponse.json({ error: 'Failed to persist array column on this schema' }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
