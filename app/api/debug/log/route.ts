import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Very small, best-effort server-side capture: log to stdout so hosting
    // platform can collect logs. In production, replace this with Sentry/DB.
    console.error('[client-error-report]', JSON.stringify(body, null, 2));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[client-error-report] failed parse', e);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
