# API Conventions and Utilities

This document outlines the server/API conventions used in MonoLog and the helper utilities available to keep route handlers consistent, safe, and fast.

## Response Helpers

Use `lib/apiResponse.ts` to produce responses:

- `apiSuccess(data, status = 200, opts?)`
  - Adds `X-Content-Type-Options: nosniff` by default
  - Optional `opts.cacheSeconds` automatically sets `Cache-Control: public, max-age=<s>, stale-while-revalidate=<2s>`
  - Optional `opts.headers` lets you add or override headers
- `apiError(message, status = 500, data?, opts?)`
  - Same default/merge behavior for headers

These helpers standardize headers and make it easy to opt-in to safe caching.

## Request Utilities

Located in `src/lib/api/utils.ts`:

- `getClientIp(req: Request): string`
  - Extracts best-effort client IP from `x-forwarded-for` / `x-real-ip`
- `makeWeakETag(data: any): string`
  - Creates a weak ETag for JSON-serializable bodies. Useful for 304 responses
- `checkRateLimitResponse(limiter, ip, useApiError = false)`
  - Returns a NextResponse if the request should be rate-limited

## Rate Limiting

Pre-configured limiters live in `src/lib/rateLimiter.ts`:

- `apiRateLimiter` – default API usage
- `strictRateLimiter` – more strict for sensitive endpoints
- `authRateLimiter` – for auth-related flows

Apply like this:

```ts
const ip = getClientIp(req);
const rateLimitRes = checkRateLimitResponse(apiRateLimiter, ip, true);
if (rateLimitRes) return rateLimitRes;
```

## Caching and ETags

For GET endpoints that can be cached briefly, prefer `apiSuccess` with `cacheSeconds` and include an ETag:

```ts
const body = [...];
const etag = makeWeakETag(body);
const inm = req.headers.get('if-none-match');
const headers = { ETag: etag };
const cacheSeconds = 30;
if (inm && inm === etag) {
  return new NextResponse(null as any, {
    status: 304,
    headers: new Headers({
      ...headers,
      'Cache-Control': `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`,
    }),
  });
}
return apiSuccess(body, 200, { headers, cacheSeconds });
```

## Auth on Server

Use `src/lib/api/serverVerifyAuth.ts`:

- `getUserFromAuthHeader(req)` – validates `Authorization: Bearer <token>` via Supabase Auth REST
- `getTokenFromAuthHeader(req)` – extracts the token string only

Use `getServiceSupabase()` and `getUserSupabase(token)` from `src/lib/api/serverSupabase.ts` for database access.

## Example Route Patterns

- GET with caching (e.g., `app/api/comments/route.ts`)
- POST with rate-limit + validation (e.g., `app/api/posts/create/route.ts`, `app/api/comments/add/route.ts`)

## Notes

- Avoid logging secrets; use `src/lib/logger.ts` which suppresses debug logs in production and redacts sensitive keys
- Prefer zod schemas for request validation where applicable
- For multi-instance deployments, replace in-memory caches/limiters with a shared store (e.g., Redis)
