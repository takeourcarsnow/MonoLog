import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Server supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'public' },
    global: { headers: { 'x-application-name': 'monolog-server' } },
  });
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run') || args.length === 0, // default to dry-run if no args
    apply: args.includes('--apply') || args.includes('--run'),
    limit: (() => {
      const i = args.indexOf('--limit');
      if (i === -1) return undefined;
      const v = args[i + 1];
      return v ? parseInt(v, 10) : undefined;
    })(),
  };
}

async function convertAvatars() {
  const { dryRun, apply, limit } = parseArgs();
  const sb = getServiceSupabase();

  console.log('Running convert-avatars-to-webp.js', dryRun ? '(dry-run)' : '(apply enabled)');

  // Fetch users with avatar_url set to supabase storage posts bucket
  const { data: users, error } = await sb
    .from('users')
    .select('id, avatar_url')
    .not('avatar_url', 'is', null);

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  const supabaseBase = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!supabaseBase) throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL missing');

  const candidates = users
    .map(u => ({ id: u.id, avatar_url: (u.avatar_url || '').split('?')[0] }))
    .filter(u => u.avatar_url && u.avatar_url.includes('/storage/v1/object/public/posts/'))
    .filter(u => !u.avatar_url.endsWith('.webp'));

  console.log(`Found ${candidates.length} users with avatars in posts storage that are not .webp`);
  let processed = 0;

  for (const user of candidates) {
    if (limit && processed >= limit) break;
    processed++;

    try {
      const urlObj = new URL(user.avatar_url);
      const path = urlObj.pathname.split('/storage/v1/object/public/posts/')[1];
      if (!path) {
        console.warn(`Skipping (can't parse path): ${user.avatar_url}`);
        continue;
      }

      const extMatch = path.match(/\.[^.]+$/);
      if (!extMatch) {
        console.warn(`Skipping (no extension): ${path}`);
        continue;
      }

      const newPath = path.replace(/\.[^.]+$/, '.webp');
      const newUrl = `${supabaseBase}/storage/v1/object/public/posts/${newPath}`;

      if (dryRun) {
        console.log(`[dry-run] would convert user ${user.id}:`);
        console.log(`  from: ${user.avatar_url}`);
        console.log(`  to:   ${newUrl}`);
        continue;
      }

      // If applying, download, convert, upload, update db
      console.log(`Converting avatar for user ${user.id}: ${user.avatar_url}`);
      const resp = await fetch(user.avatar_url);
      if (!resp.ok) throw new Error(`Failed to download: ${resp.status} ${resp.statusText}`);
      const arrayBuffer = await resp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();

      const { error: uploadError } = await sb.storage.from('posts').upload(newPath, webpBuffer, {
        upsert: true,
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000, immutable',
      });

      if (uploadError) throw uploadError;

      // Update user's avatar_url to new url (add cache-busting param)
      const cacheBusted = newUrl + '?v=' + Date.now();
      const { error: updateError } = await sb.from('users').update({ avatar_url: cacheBusted }).eq('id', user.id);
      if (updateError) throw updateError;

      console.log(`Updated user ${user.id} -> ${cacheBusted}`);
    } catch (err) {
      console.error(`Failed for user ${user.id}:`, err.message || err);
    }
  }

  console.log('Done.');
}

convertAvatars().catch(err => {
  console.error(err);
  process.exit(1);
});
