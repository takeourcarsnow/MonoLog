## Copilot instructions for MonoLog

Be concise. Focus on small, testable edits and preserve performance/security patterns.

- Project overview: Next.js 14 App Router + TypeScript. UI lives under `app/` and reusable UI lives in `app/components`.
- Backend integration: Supabase (Postgres + Storage). Public runtime values are injected in `app/layout.tsx` (`runtime-supabase-init`).
- PWA: `sw.js` and `manifest.webmanifest` are active. Service worker is registered in `app/layout.tsx` (production only) and triggers reload on update.

Key developer workflows (run these from repo root):

- Install: `npm install`
- Dev: `npm run dev` (or `npm run dev:turbo` for turbo-enabled dev)
- Build: `npm run build` ; Start: `npm start`
- Analyze bundle: `ANALYZE=true npm run build` or `npm run analyze`
- Performance checks: `npm run check-perf` (wraps checks in `scripts/check-performance.js`)
- Tests: `npm test` (Jest + ts-jest)
- Lint: `npm run lint`

Important files to read before making changes

- `next.config.mjs` — security headers, CSP, image remotePatterns (Supabase host), swcMinify, optimizePackageImports, webpack tweaks. If you add external image hosts, update both `images.remotePatterns` and CSP here.
- `app/layout.tsx` — root layout. Uses dynamic client-only imports for AppShell/NavBar and contains inline runtime scripts (theme/init, viewport, Supabase injection). Be careful editing; SSR/client boundaries are deliberate (many components are client-only).
- `app/components/*` — client and server components. Many interactive components are loaded dynamically with `ssr: false` (see `AppShell` dynamic import pattern).
- `app/api/*` — API routes. Follow existing route patterns when adding endpoints.
- `scripts/check-performance.js` — automated checks referenced by `npm run check-perf`. Useful to see what the project expects (OptimizedImage, PostCard memoization, api cache, performance monitor).
- `README.md` — contains image limits (8MB, 1600px), environment guidance (`NEXT_PUBLIC_MODE`, Supabase vars) and high-level conventions.

Codebase conventions and patterns (concrete examples)

- Client-only dynamic imports: use

  dynamic(() => import('...').then(m => m.Component), { ssr: false, loading: () => null })

  This pattern prevents client-only hooks from running during SSR (see `app/layout.tsx`).

- Runtime injection: small inline scripts use `dangerouslySetInnerHTML` to seed theme, viewport, and public Supabase values. Don't remove or refactor them without ensuring equivalent client bootstrap behavior.

- Images: use the `OptimizedImage` component when possible (see `app/components/OptimizedImage.tsx`). Next.js image settings are tuned in `next.config.mjs` (AVIF/WebP, deviceSizes, remotePatterns). When adding storage hosts, update both `next.config.mjs` and any client-side image usage.

- Performance-first edits: scripts/check-performance.js looks for patterns like `memo(PostCardComponent`, an API cache at `src/lib/api/cache.ts`, and `src/lib/performance-monitor.ts`. Favor small, measurable changes and run `npm run check-perf` after changes.

Security notes

- CSP and security headers are centrally defined in `next.config.mjs`. If you add external script/style/image origins, update the CSP and `images.remotePatterns` accordingly.
- `compiler.removeConsole` is enabled in production by `next.config.mjs` — avoid relying on console side-effects in prod.

Tests and verification

- Unit tests: Jest is configured; run `npm test`. If adding new features, include a basic test in the existing test setup.
- Local verification: run dev and inspect service worker flow (layout registers SW only in production); to test SW behavior locally, build and run production server: `npm run build && npm start`.

Common pitfalls for AI edits

- Do not convert client components to server components unless you update uses and remove client-only hooks. Many components rely on client-only behavior (navigation hooks, event listeners).
- Avoid breaking inline runtime scripts in `app/layout.tsx` — these are used to set theme and inject Supabase runtime values.
- When changing image delivery or adding new remote hosts, update `next.config.mjs` and CSP together.

Where to look for examples

- Dynamic client import pattern: `app/layout.tsx`
- SW registration & update flow: `app/layout.tsx` (WebVitalsScript)
- Performance checks: `scripts/check-performance.js`
- Bundle optimization & CSP: `next.config.mjs`
- Runtime Supabase injection: `app/layout.tsx` `runtime-supabase-init`

If something isn't discoverable

- Ask for the intended runtime (local vs Supabase deployment) because environment variables and remote image hosts differ.

Please review and tell me which areas you'd like expanded (tests, CI steps, more file examples, or infra/deployment notes).

## Expanded: CI, tests, quick checks, and troubleshooting

CI recommendations

- Minimal CI job (preferred GitHub Actions):
  - Install node (LTS), run `npm ci`, `npm run lint`, `npm test`, `npm run build`, and `npm run check-perf`.
  - Cache `~/.npm` and `.next` between runs when possible to speed builds.
  - If enabling bundle analysis, run `ANALYZE=true npm run build` as an optional job.

Testing notes & examples

- Unit tests use Jest + ts-jest. Keep tests small and focused. Example test target location: `__tests__/` or `app/components/*/*.test.tsx`.
- When adding tests that interact with Supabase, mock `@supabase/supabase-js` and avoid leaking real keys. Use `NEXT_PUBLIC_MODE=local` in test env.
- Example jest config is expected in repo root (ts-jest is present). If you add snapshots, ensure they're checked into the PR.

Quick verification commands (repo root)

```powershell
# Install dependencies
npm ci

# Run lint
npm run lint

# Run unit tests
npm test

# Quick perf checks
npm run check-perf

# Start dev server
npm run dev
```

Troubleshooting common issues

- Hydration mismatches: check `app/layout.tsx` for deliberate server/client scripts. Many components are dynamically imported with `ssr: false` — do not convert them to server components without updating callers.
- Service Worker not registering locally: SW is registered only in production builds. To test SW behavior locally, run:

```powershell
npm run build; npm start
```

- Image load failures from Supabase: ensure the bucket host is listed in `next.config.mjs` `images.remotePatterns` and the CSP `img-src` allows the host.
- Missing runtime Supabase values in browser: `app/layout.tsx` injects `__MONOLOG_RUNTIME_SUPABASE__` using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. For local dev, set `NEXT_PUBLIC_MODE=local` in `.env.local`.

Small, safe improvements you can add

- Add unit tests for `app/components/OptimizedImage.tsx` to assert correct srcset/format selection.
- Add a smoke E2E (Playwright) job that builds the app and checks the homepage loads (optional).
- Add a small GitHub Action that runs `npm run check-perf` early to prevent performance regressions.

Files to cite when making changes

- `next.config.mjs` — CSP, image host, performance flags
- `app/layout.tsx` — dynamic client imports, inline runtime scripts, SW registration
- `scripts/check-performance.js` — what the `check-perf` script asserts
- `app/components/OptimizedImage.tsx` — preferred image component

If you'd like, I can:

- Add a sample GitHub Actions workflow file to `.github/workflows` that runs the minimal CI steps above.
- Create a small Jest test for `OptimizedImage` as an example.

Tell me which of the above you'd like next and I'll implement it.

## How main files interact (runtime flow)

This project intentionally separates server-rendered shell and client-only interactive pieces. Below is a concise runtime flow and the responsibilities of the main files so an AI agent can make safe edits.

- `app/layout.tsx` — Root layout and bootstrapper.
  - Injects small inline runtime scripts via `dangerouslySetInnerHTML` for theme initialization (`theme-init`), viewport sizing (`set-vh`) and public Supabase values (`runtime-supabase-init`). These scripts run early on the client and are required for consistent theme/viewport behavior and to avoid race conditions when reading Supabase settings.
  - Dynamically imports heavy/interactive client components with `ssr: false` (e.g., `AppShell`, `NavBar`, `AppPreloader`, `InertPolyfillClient`) to avoid client hook execution during SSR and to reduce initial server render.
  - Registers the service worker (only in production) and wires update lifecycle events so a new worker triggers a page reload when activated.

- `app/components/AppPreloader.tsx` — Preload UI and global readiness.
  - Client-only; mounted early to display a consistent loading state. It can listen to global readiness events and coordinate when the main app shell should reveal content.

- `app/components/AppShell.tsx` — Main interactive shell and layout.
  - Client component that holds navigation, content container, and app-level context providers. Loaded dynamically in `app/layout.tsx` with `ssr: false` to prevent server rendering issues with hooks like `useRouter`.
  - Hosts view switching (Feed/Explore/Profile) and passes props down to interactive components.

- `app/components/NavBar.tsx` / `NavbarInteractive.tsx` — navigation UI.
  - Dynamically loaded to keep server HTML small. Avoid moving logic from interactive navbar to server components; instead, keep behavior in client-only files or migrate callers carefully.

- `app/components/OptimizedImage.tsx` — image wrapper & optimization.
  - Preferred entry point for images. Honors sizing/format preferences and works with Next.js `images` settings in `next.config.mjs` (AVIF/WebP, deviceSizes, remotePatterns).
  - When adding new remote image sources (e.g., another storage host), update `next.config.mjs` `images.remotePatterns` and the Content-Security-Policy in `next.config.mjs` headers.

- `app/api/*` — server routes.
  - Implement backend logic (comments, uploads, users, posts, storage access). Follow existing route structure and use server-safe dependencies only.

- `sw.js` — service worker.
  - Registered from `app/layout.tsx` in production; handles offline caching and update lifecycle messages. Edits to SW require re-building and testing in a production build (`npm run build && npm start`).

- `scripts/check-performance.js` — repository expectations for performance.
  - Not a hard requirement, but CI/tests should run it to detect regressions. It searches for memoized components, caching, image workers, and optimized image components.

Quick editing rules for agents

- When editing `app/layout.tsx`, do not remove inline scripts; instead, replicate their behavior if you refactor (theme & runtime Supabase injection). These scripts intentionally prevent hydration flashes and seed runtime values.
- If you convert a client component to a server component, update all callers and remove client-only hooks; prefer leaving interactive components client-only and import them dynamically instead.
- When changing image origins or adding storage providers:
  1. Update `next.config.mjs` `images.remotePatterns`.
 2. Update `next.config.mjs` CSP `img-src` and `connect-src` as needed.
 3. Update any client components that assume the previous host (URLs, caching).

If you'd like, I'll add a small GitHub Actions workflow and an example Jest test next. Which should I implement first?
