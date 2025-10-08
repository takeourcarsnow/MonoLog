import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';

// Simple in-memory rate limiter. This is per-server-process and will reset
// when the process restarts. For production scale use a shared store (Redis).
type AttemptRecord = { count: number; firstTs: number; blockedUntil?: number };
const attemptsByIp = new Map<string, AttemptRecord>();
const attemptsById = new Map<string, AttemptRecord>();

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_ATTEMPTS = 5; // max attempts per window before block
const BLOCK_MS = 15 * 60 * 1000; // block duration 15 minutes

function now() { return Date.now(); }

function isBlocked(record?: AttemptRecord) {
  if (!record) return false;
  if (record.blockedUntil && record.blockedUntil > now()) return true;
  return false;
}

function registerFailure(map: Map<string, AttemptRecord>, key: string) {
  const ts = now();
  const rec = map.get(key);
  if (!rec) {
    map.set(key, { count: 1, firstTs: ts });
    return;
  }
  // reset window if expired
  if (ts - rec.firstTs > WINDOW_MS) {
    rec.count = 1;
    rec.firstTs = ts;
    rec.blockedUntil = undefined;
    map.set(key, rec);
    return;
  }
  rec.count += 1;
  if (rec.count > MAX_ATTEMPTS) {
    rec.blockedUntil = ts + BLOCK_MS;
  }
  map.set(key, rec);
}

function resetRecord(map: Map<string, AttemptRecord>, key: string) {
  map.delete(key);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = (body?.identifier || '').toString().trim();
    const password = (body?.password || '').toString();
    if (!identifier || !password) return NextResponse.json({ error: 'Missing identifier or password' }, { status: 400 });

    // identify client IP (best-effort). If behind a proxy, ensure X-Forwarded-For
    const forwarded = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    const ip = forwarded.split(',')[0].trim() || 'unknown';

    // Check per-IP and per-identifier blocking
    const ipRec = attemptsByIp.get(ip);
    if (isBlocked(ipRec)) return NextResponse.json({ error: 'Too many attempts from this IP. Try later.' }, { status: 429 });
    const idRec = attemptsById.get(identifier);
    if (isBlocked(idRec)) return NextResponse.json({ error: 'Too many attempts for this identifier. Try later.' }, { status: 429 });

    const sb = getServiceSupabase();

    // Resolve identifier to email. If identifier contains '@', treat as email.
    let email: string | null = null;
    if (identifier.includes('@')) {
      email = identifier;
    } else {
      // try to find profile id then fetch auth user email
      const tryFindProfile = async () => {
        let res: any = await sb.from('users').select('id').eq('username', identifier).limit(1).maybeSingle();
        if (res && res.data && res.data.id) return res.data.id;
        res = await sb.from('users').select('id').eq('user_name', identifier).limit(1).maybeSingle();
        if (res && res.data && res.data.id) return res.data.id;
        res = await sb.from('users').select('id').ilike('username', identifier).limit(1).maybeSingle();
        if (res && res.data && res.data.id) return res.data.id;
        return null;
      };

      const profileId = await tryFindProfile();
      if (profileId) {
        try {
          // @ts-ignore
          const adminRes: any = await sb.auth.admin.getUserById(profileId);
          const authUser = adminRes?.data?.user ?? adminRes?.user ?? null;
          if (authUser && authUser.email) email = authUser.email;
        } catch (e) {
          // ignore and continue to fallback
        }
      }

      if (!email) {
        // fallback: older schemas may have stored email on the profile row
        try {
          const { data: profileWithEmail } = await sb.from('users').select('email').or(`username.eq.${identifier},user_name.eq.${identifier}`).limit(1).maybeSingle();
          if (profileWithEmail && profileWithEmail.email) email = profileWithEmail.email;
        } catch (e) {
          // ignore
        }
      }
    }

    if (!email) {
      // Register failure and return not found
      registerFailure(attemptsByIp, ip);
      registerFailure(attemptsById, identifier);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Perform sign-in using the service-role client. This will return a session
    // object containing access_token and refresh_token which we will return to
    // the client. The client will set the session locally.
    const res = await sb.auth.signInWithPassword({ email, password });
    const { data, error } = res as any;
    if (error) {
      // register failures for rate limiting
      registerFailure(attemptsByIp, ip);
      registerFailure(attemptsById, identifier);
      return NextResponse.json({ error: error.message || error }, { status: 401 });
    }

    // Success: clear any failure records for this ip/identifier
    resetRecord(attemptsByIp, ip);
    resetRecord(attemptsById, identifier);

    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
