/**
 * Check if SUPABASE_SERVICE_ROLE_KEY is configured properly.
 * Run this to diagnose missing service role configuration.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('\n=== Supabase Configuration Check ===\n');

console.log('NEXT_PUBLIC_SUPABASE_URL:', url ? '✓ Set' : '✗ Missing');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', anonKey ? '✓ Set' : '✗ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✓ Set' : '✗ MISSING (REQUIRED FOR SERVER ENDPOINTS)');

if (!serviceKey) {
  console.log('\n⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY is not set!');
  console.log('\nThis is required for:');
  console.log('  - Creating user profiles after sign-up');
  console.log('  - Creating posts (FK to users table)');
  console.log('  - Following/unfollowing users');
  console.log('  - Storage uploads');
  console.log('\nTo fix:');
  console.log('  1. Go to Supabase Dashboard → Settings → API');
  console.log('  2. Copy the "service_role" key (NOT the anon key)');
  console.log('  3. Add to .env.local:');
  console.log('     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
  console.log('  4. Restart your dev server\n');
  process.exit(1);
}

console.log('\n✓ All required environment variables are set!\n');
