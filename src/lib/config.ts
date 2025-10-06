type Mode = "local" | "supabase";

export const CONFIG = {
  appName: "MonoLog",
  // allow switching the backend from the environment (use NEXT_PUBLIC_MODE in Vercel)
  // If a Supabase URL is present in NEXT_PUBLIC_SUPABASE_URL, prefer running in
  // "supabase" mode locally so dev can exercise the real backend without
  // manually setting NEXT_PUBLIC_MODE.
  mode: (() => {
    const envMode = process?.env?.NEXT_PUBLIC_MODE as Mode | undefined;
    const hasSupabase = Boolean(process?.env?.NEXT_PUBLIC_SUPABASE_URL);
    return envMode || (hasSupabase ? ("supabase" as const) : ("local" as const));
  })(),
  // disable demo seeding by default; set to true locally when you want seeded content
  seedDemoData: false,
  dailyPostingLimit: 1,
  imageMaxSizeMB: 8,
  imageMaxEdge: 1600,
  enableServiceWorker: true,
};

// Supabase configuration read from NEXT_PUBLIC_* env vars so they're available client-side
export const SUPABASE = {
  url: process?.env?.NEXT_PUBLIC_SUPABASE_URL || "",
  anonKey: process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
};

// Development-time debug to help diagnose why the app may still run in local mode.
// This intentionally does not log secret keys. Restart the dev server after
// changing .env.local to ensure NEXT_PUBLIC_* variables are picked up.
if (process.env.NODE_ENV !== 'production') {
  try {
    // only print whether the URL is present, not the value
    // eslint-disable-next-line no-console
    // Debug logging removed per user request.
  } catch (e) {
    // swallow errors
  }
}
