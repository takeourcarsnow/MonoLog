# MonoLog

MonoLog is a minimal, privacy-minded daily photo journal built with Next.js (App Router), TypeScript and Tailwind CSS.

This project has received several updates since the original README: it uses Next 14 + React 18.3, TypeScript 5, and includes a small server-side API surface (App Router `app/api/*`) alongside a local in-browser adapter so the app can run fully offline/private.

Highlights

- One-post-per-day workflow (create or replace today's entry)
- Multi-image posts (client supports multiple images per post)
- Local browser storage mode (default) for zero-config, private use
- Optional Supabase persistence with client & server adapters
- Client-side image resizing + WebP/JPEG encoding to keep uploads small
- Small set of UI features: Feed, Explore, Favorites, Calendar view, Profile, Upload, Notifications

What changed since last README

- Upgraded dependencies: Next 14, React 18.3, TypeScript 5.x
- New/updated API routes under `app/api/` for posts, comments, storage uploads and small debug helpers
- Runtime config moved to `src/lib/config.ts` and now auto-detects `supabase` mode if `NEXT_PUBLIC_SUPABASE_URL` is present
- A `scripts/check-env.js` helper now loads `.env.local`/`.env` when available and performs a lightweight check for required NEXT_PUBLIC_* keys
- Security headers (including a CSP) are configured in `next.config.mjs`

Quick start (Windows PowerShell)

Open PowerShell in the repository root and run:

```powershell
npm install
npm run dev
# then open http://localhost:3000
```

Development scripts

- npm run dev      — start Next.js dev server (uses `next dev --turbo`)
- npm run build    — build for production
- npm start        — run production build
- npm run lint     — run ESLint (Next.js config)
- npm run analyze  — build with ANALYZE=true
- npm run check-env — run `scripts/check-env.js` to validate env vars

Modes & environment variables

MonoLog supports two runtime modes. The runtime mode is driven by `NEXT_PUBLIC_MODE` but `src/lib/config.ts` will prefer `supabase` automatically when `NEXT_PUBLIC_SUPABASE_URL` is present.

- local (default): stores data in LocalStorage. No external services required.
- supabase: uses Supabase for persistence and multi-user behavior.

Important environment variables (client-side, required for Supabase mode)

- NEXT_PUBLIC_MODE — `local` or `supabase` (if omitted, the app will choose `supabase` when `NEXT_PUBLIC_SUPABASE_URL` exists)
- NEXT_PUBLIC_SUPABASE_URL — your Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon/public key

Validate env vars locally with:

```powershell
npm run check-env
```

Configuration

Runtime configuration is in `src/lib/config.ts` (exported `CONFIG` and `SUPABASE`). Notable options:

- CONFIG.seedDemoData — when true (local mode) the app seeds sample users/posts for development (default: false)
- CONFIG.dailyPostingLimit — posts allowed per day (default: 1)
- CONFIG.imageMaxSizeMB / CONFIG.imageMaxEdge — client image constraints (defaults: 8 MB, 1600px)
- CONFIG.enableServiceWorker — currently `false` by default

Toggle `seedDemoData` in `src/lib/config.ts` or modify the file during local development to get demo content on first load.

Image handling

Client image resizing and encoding lives in `src/lib/image.ts`. The uploader prefers WebP and will resize images to meet `CONFIG.imageMaxEdge` and `imageMaxSizeMB` before uploading. When using Supabase mode the client may POST data-URLs to `app/api/storage/upload` which stores files and returns public URLs.

Server API routes

Server routes are under `app/api/` and include endpoints for posts, comments, storage uploads and a few debug helpers. Notable paths:

- `app/api/posts/create/route.ts` — create posts (used by Supabase/server flows)
- `app/api/storage/upload/route.ts` — receives client data-URLs and stores files (returns public URL)
- `app/api/comments/add/route.ts`, `app/api/posts/delete/route.ts`, `app/api/posts/update/route.ts` — small server helpers used by the Supabase adapter

If you run in `local` mode, none of these remote calls are required — the app will use the in-browser adapter in `src/lib/api/local.ts`.

Security

Default security headers (HSTS, X-Frame-Options, CSP, etc.) are set up in `next.config.mjs`. The Content Security Policy allows images from `data:`/`blob:` and `https:` and permits connections to same-origin and `https` by default; adjust if you point storage to other domains.

Project structure (high level)

- `app/` — Next App Router pages and server routes
- `src/components/` — all React components (UI pieces like Header, NavBar, PostCard, Uploaders, Editor)
- `src/lib/` — helpers and adapters (api, image, storage, config, types)
- `public/` — static assets (logo, icons)
- `scripts/` — small developer helpers (`check-env.js`, `inspect-feed.js`)

Developer tips

- To exercise the Supabase flow locally, create a `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `src/lib/config.ts` will then choose `supabase` mode automatically unless `NEXT_PUBLIC_MODE` is explicitly set.
- Use `CONFIG.seedDemoData = true` during local development to populate the UI with sample posts.
- Run `npx tsc --noEmit` to run a TypeScript-only check.

Contributing

Contributions welcome. Good starter tasks:

- add unit / integration tests for `src/lib/*` logic
- provide example SQL / migration for Supabase schema and storage bucket setup
- add a seed script or an option to enable seeded content via an env var at runtime

Quality gates (quick)

- Build: `npm run build` (Next 14)
- Lint: `npm run lint`
- Env check: `npm run check-env`

License

MIT

Contact

Open an issue in this repository if you need help running the project or wiring a Supabase schema.
