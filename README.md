# MonoLog (Next.js + TypeScript + Tailwind)

Local-first daily photo journal — one photo per day.


## Running

```bash
npm install
npm run dev
# http://localhost:3000
```
# MonoLog

MonoLog is a local-first daily photo journal built with Next.js (App Router), TypeScript and Tailwind.
The core idea: one photo per day, a focused personal log you can run locally in your browser.

Key highlights
- Next.js 14 (App Router)
- TypeScript + React 18
- Tailwind CSS for styling
- LocalStorage-backed API with demo seed data (optional Supabase backend included)

Quick links
- Live dev: http://localhost:3000 (when running locally)

## Requirements
- Node.js 18 or newer (recommended)
- npm (or your preferred package manager)

## Quick start
Open a terminal (PowerShell on Windows) in the project root and run:

```powershell
npm install
npm run dev
# then open http://localhost:3000
```

## Environment

MonoLog can run purely in local mode (default) or point to a Supabase backend.

1. Copy `.env.example` to `.env.local` and edit values.
2. Toggle backend mode with `NEXT_PUBLIC_MODE=local` or `NEXT_PUBLIC_MODE=supabase`.

If you use Supabase, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your project settings. These anon keys are safe for client usage but never publish service_role keys from a client app.

Example file is included at the project root as `.env.example`.

Available npm scripts (from `package.json`)
- `dev` — start Next.js in development mode
- `build` — build the production app
- `start` — start the production server
- `lint` — run the Next.js linter

Project structure (important files)
- `app/` — Next.js app routes and pages (App Router)
	- `page.tsx`, route folders like `feed`, `explore`, `upload`, `calendar`, `profile`, `post`, `about`
- `src/components/` — UI components (Header, NavBar, PostCard, Views, etc.)
- `src/lib/` — local APIs, helpers, and types
	- `src/lib/api/local.ts` — localStorage-backed API implementation
	- `src/lib/api/supabase.ts` — optional Supabase integration
- `public/` or `app/icon.svg` — app icon and static assets
- `tailwind.config.ts`, `postcss.config.js`, `tsconfig.json` — project config

Data and state
- By default the app uses a localStorage-backed API. This means your posts, accounts, and likes live in your browser only.
- The app includes a demo seeding flow to populate sample users and posts on first run.
- There is optional Supabase integration (see `src/lib/api/supabase.ts`) if you want a remote backend. You’ll need to wire environment variables and update the API used by the app.

Development notes
- Switch accounts using the Account menu in the app — accounts are stored locally.
- To persist data across browsers or machines, integrate Supabase or another server and update `src/lib/api` usage.

Testing & linting
- `npm run lint` — runs Next.js/ESLint checks. Add unit tests as needed.

Deploying
- Build for production with `npm run build` and run with `npm start`.
- Deploy anywhere that supports Next.js 14 (Vercel, self-hosted Node, etc.). Check provider docs for Next.js 14 App Router specifics.

Contributing
- Open issues or PRs if you find bugs or want features. Keep changes focused and provide a short description + steps to reproduce.

Acknowledgements
- This project was scaffolded to demonstrate a minimal, local-first journaling app using modern Next.js and Tailwind.

License
- MIT (or change as appropriate for your project)

If you'd like, I can also:
- add a short CONTRIBUTING.md
- wire a basic Supabase example (env variables + instructions)
- add a small seed/reset script to make demo data easy to recreate

---

Updated README generated on 2025-09-28.