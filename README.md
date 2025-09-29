# MonoLog

MonoLog is a minimal daily photo journal built with Next.js (App Router), TypeScript and Tailwind.

The core idea: one post per day. Attach multiple images to a single daily entry and keep a lightweight visual journal.

## Highlights

-- One-post-per-day workflow (attach multiple images to a post)
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS utility styles
-- LocalStorage-backed API by default, optional Supabase integration for remote persistence

## Quick start (Windows PowerShell)

```powershell
npm install
npm run dev
# open http://localhost:3000 (Next will pick an alternative port if 3000 is in use)
```

## Environment & modes

- Default: browser LocalStorage-backed API
- Optional remote mode: set `NEXT_PUBLIC_MODE=supabase` and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`

## How to use

-- Post: use the Post (Upload) tab to add today’s entry with up to 5 images
- Feed: follow people and browse posts in your feed
- Explore: browse public posts from other users
- Calendar: browse posts by date

## Project layout (important files)

- `app/` — Next.js routes and pages (App Router)
- `src/components/` — UI components (Uploader, Header, NavBar, Post cards)
- `src/lib/` — local APIs, helpers and typings (`src/lib/api/local.ts`, `src/lib/api/supabase.ts`)
- `app/icon.svg` — app icon and static assets

## Scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm start` — run production build
- `npm run lint` — lint the project

## Notes

- This project is intended as a minimal proof-of-concept. Your posts live in the browser by default.
- Use Supabase (or another backend) if you want persistence across devices; the codebase includes an optional Supabase adapter.

## Contributing

Send PRs or open issues. Small focused patches and clear descriptions are appreciated.

## License

MIT


If you want I can also add a `CONTRIBUTING.md`, a small seed/reset script, or an onboarding flow to demo the app with sample accounts.