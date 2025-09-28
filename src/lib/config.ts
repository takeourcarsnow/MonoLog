export const CONFIG = {
  appName: "MonoLog",
  mode: "local" as const, // "local" for now; switch to "supabase" later
  seedDemoData: true,
  dailyPostingLimit: 1,
  imageMaxSizeMB: 8,
  imageMaxEdge: 1600,
  enableServiceWorker: false,
};