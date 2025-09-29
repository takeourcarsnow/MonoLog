// Simple environment validation script for CI / local dev
// Fails with non-zero exit code when required env vars are missing.

const required = [
  // public client keys expected by the app
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('\nMissing required environment variables:');
  for (const k of missing) console.error(' -', k);
  console.error('\nSet them in your environment or .env.local for local development.');
  process.exit(1);
}

console.log('Environment check passed.');
