import { NextResponse } from 'next/server';

type ApiOptions = {
  headers?: HeadersInit;
  cacheSeconds?: number; // if provided, sets Cache-Control to public, max-age=cacheSeconds, stale-while-revalidate=2*cacheSeconds
};

const defaultHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
};

function mergeHeaders(extra?: HeadersInit, cacheSeconds?: number): Headers {
  const h = new Headers(defaultHeaders);
  if (cacheSeconds && cacheSeconds > 0) {
    const sMax = Math.max(cacheSeconds * 2, cacheSeconds);
    h.set('Cache-Control', `public, max-age=${cacheSeconds}, stale-while-revalidate=${sMax}`);
  }
  if (extra) {
    const add = new Headers(extra);
    add.forEach((v, k) => h.set(k, v));
  }
  return h;
}

export function apiError(message: string, status: number = 500, data?: any, opts?: ApiOptions) {
  const headers = mergeHeaders(opts?.headers);
  return NextResponse.json({ error: message, ...data }, { status, headers });
}

export function apiSuccess(data: any, status: number = 200, opts?: ApiOptions) {
  const headers = mergeHeaders(opts?.headers, opts?.cacheSeconds);
  return NextResponse.json(data, { status, headers });
}