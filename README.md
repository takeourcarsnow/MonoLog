# MonoLog

MonoLog is a minimal, privacy-minded daily photo journal built with Next.js (App Router), TypeScript and Tailwind CSS.

The core idea: one post per day. Each post can include multiple images and a short caption so you can keep a lightweight visual diary.

## Key features

- One-post-per-day workflow (create or replace today's entry)
- Multi-image posts (1–5 images supported)
- Local browser storage mode (default) for zero-config, private use
- Optional remote persistence using Supabase (client + server routes provided)
- Image compression and client-side resizing to keep uploads small
- Small set of UI features: Feed, Explore, Favorites, Calendar view, Profile, Upload

## Quick start (Windows PowerShell)

Open a PowerShell terminal in the repository root and run:

```powershell
npm install
npm run dev
# then open http://localhost:3000
```

Notes:
- The dev server runs Next 14 App Router. Next will pick a different port if 3000 is in use.
- Run `npm run build` and `npm start` for production builds.

## Development scripts

- npm run dev    — start Next.js dev server
- npm run build  — build for production
- npm start      — run production build
- npm run lint   — run Next.js/ESLint checks
- npm run check-env — lightweight env validation script (scripts/check-env.js)

## Modes & environment variables

MonoLog supports two runtime modes. The mode is selected by the `NEXT_PUBLIC_MODE` environment variable.

- local (default): stores data in browser LocalStorage. No server or database required.
- supabase: uses Supabase (client-side anon key + server-side API routes) for persistence and multi-user functionality.

Important environment variables (client-side, required for Supabase mode):

- NEXT_PUBLIC_MODE — `local` or `supabase` (default: `local`)
- NEXT_PUBLIC_SUPABASE_URL — your Supabase project URL (required when mode is `supabase`)
- NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon/public key (required when mode is `supabase`)

You can validate required env vars locally with:

```powershell
npm run check-env
```

When using Supabase, the app expects database tables (typical names used in the code): `users`, `posts`, `comments` and a storage bucket for uploads. The Supabase adapter will attempt to upsert a minimal `users` profile row when an authenticated user signs in.

## Configuration (local)

There is a small runtime config at `src/lib/config.ts`:

- dailyPostingLimit — number of posts allowed per day (default: 1)
- imageMaxSizeMB, imageMaxEdge — image constraints used by the client compressor
- seedDemoData — when true (local mode) the app will seed sample users/posts for development (default false in repo)

Toggle `seedDemoData` in `src/lib/config.ts` during local dev if you want sample content on first load.

## Image handling

Uploads are compressed client-side by `src/lib/image.ts`. Files are resized and encoded (WebP preferred, JPEG fallback) to meet configured limits. When posting to Supabase the app will send data-URLs to the server upload route (`/api/storage/upload`) which stores the file and returns a public URL for the post.

Key constraints:
- max file edge: configurable via `CONFIG.imageMaxEdge` (default in code: 1600px)
- max file size: configurable via `CONFIG.imageMaxSizeMB` (default in code: 8 MB)

## API surface and server routes

The app ships with a small client-side API abstraction in `src/lib/api/index.ts` that delegates to either the local (in-browser) adapter or the Supabase adapter.

Server-side routes are located under `app/api/` — notable endpoints:

- `app/api/posts/create/route.ts` — create posts (used by Supabase mode)
- `app/api/storage/upload/route.ts` — server-side storage upload helper used to convert client data-URLs into hosted files
- `app/api/comments/add/route.ts`, `app/api/posts/delete`, `app/api/posts/update`, and follow/unfollow endpoints — small server helpers used by the Supabase adapter

If you run in `local` mode, all data lives in LocalStorage and no external service calls are made.

## Project structure (high level)

- app/ — Next.js App Router routes and server/client pages
- src/components/ — UI components (Header, NavBar, PostCard, Uploaders, Editor, etc.)
- src/lib/ — core helpers, API adapters, image & storage helpers, types
- scripts/check-env.js — simple env validator used in CI or local checks

Open `src/lib/api/supabase.ts` to inspect how the Supabase client is used when `NEXT_PUBLIC_MODE=supabase`.

## Running with Supabase (short guide)

1. Create a Supabase project and add a Storage bucket for uploads.
2. Create minimal tables: `users`, `posts`, `comments`. The exact schema is flexible; the Supabase adapter expects common columns such as `id`, `username`, `avatar_url`, `joined_at` for users and `id`, `user_id`, `image_urls` / `image_url`, `caption`, `created_at`, `public` for posts. You can use Supabase UI to create these columns.
3. Set the following env vars (for local development add to `.env.local`):

```text
NEXT_PUBLIC_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=pub-anon-key
```

4. Start the dev server: `npm run dev`. Use the Supabase dashboard to inspect rows and storage.

Note: The repository includes server API routes that perform create/update/delete actions. Those endpoints are intended to be used with Supabase service-role credentials on the server side — the client-side uses the anon key and server APIs where appropriate.

## Tests, linting and type checks

- TypeScript is enabled. You can run a type-check with:

```powershell
npx tsc --noEmit
```

- Linting is provided by Next's ESLint config: `npm run lint`.

## Contributing

Contributions are welcome. Good starter tasks:

- add E2E tests or unit tests around the `src/lib` logic
- add a db migration script or example SQL for Supabase schema
- wire a demo seed script that runs in the dev server using an environment flag

Please open PRs against `main` with small, focused changes and a short description.

## License

MIT

## Contact

If you have questions about running the project or want help wiring a Supabase schema, open an issue in this repository.
