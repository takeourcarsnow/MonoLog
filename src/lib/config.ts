export const CONFIG = {
  appName: "MonoLog",
  dailyPostingLimit: 1,
  imageMaxSizeMB: 8,
  // Increase max image edge to allow higher-resolution uploads (was 1600)
  imageMaxEdge: 2500,
  enableServiceWorker: true,
};

// Supabase configuration read from NEXT_PUBLIC_* env vars so they're available client-side
export const SUPABASE = {
  url: process?.env?.NEXT_PUBLIC_SUPABASE_URL || "",
  anonKey: process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
};
