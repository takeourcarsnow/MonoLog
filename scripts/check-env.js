// Simple environment validation script for CI / local dev
// Fails with non-zero exit code when required env vars are missing.

// Attempt to load .env.local and .env for local development so this script
// can be run directly (e.g. `npm run check-env`) and pick up values from
// the repository's .env files. If dotenv isn't installed, we silently skip
// loading to preserve CI environments where variables are already set.
try {
  const path = require('path');
  // prefer .env.local, then fallback to .env
  try {
    require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
    require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
  } catch (e) {
    // If dotenv isn't available, attempt a lightweight manual parse of .env files
    try {
      const fs = require('fs');
      const load = (fname) => {
        try {
          const p = path.resolve(process.cwd(), fname);
          if (!fs.existsSync(p)) return;
          const src = fs.readFileSync(p, 'utf8');
          for (const line of src.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eq = trimmed.indexOf('=');
            if (eq === -1) continue;
            const key = trimmed.slice(0, eq).trim();
            let val = trimmed.slice(eq + 1).trim();
            // remove surrounding quotes
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) process.env[key] = val;
          }
        } catch (e) {
          // ignore parse errors
        }
      };
      load('.env.local');
      load('.env');
    } catch (e) {
      // ignore if fs isn't available
    }
  }
} catch (e) {
  // no-op if require or dotenv fails
}

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
