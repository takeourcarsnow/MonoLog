type Mode = "local" | "supabase";

export const CONFIG = {
  appName: "MonoLog",
  // allow switching the backend from the environment (use NEXT_PUBLIC_MODE in Vercel)
  mode: (process?.env?.NEXT_PUBLIC_MODE as Mode) || ("local" as const),
  // disable demo seeding by default; set to true locally when you want seeded content
  seedDemoData: false,
  dailyPostingLimit: 1,
  imageMaxSizeMB: 8,
  imageMaxEdge: 1600,
  enableServiceWorker: false,
};

// Supabase configuration read from NEXT_PUBLIC_* env vars so they're available client-side
export const SUPABASE = {
  url: process?.env?.NEXT_PUBLIC_SUPABASE_URL || "",
  anonKey: process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
};