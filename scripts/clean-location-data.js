#!/usr/bin/env node

/**
 * Clean Location Data Script
 * Updates existing posts to only store city names in location_address for privacy
 *
 * Usage:
 *   node scripts/clean-location-data.js [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
config({ path: path.join(process.cwd(), '.env.local') });

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-d');

if (isDryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made to the database');
  console.log('');
}

async function main() {
  console.log('🚀 Starting location data cleanup...');

  // Get Supabase config from env
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ Supabase not configured. Set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }

  const sb = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'monolog-clean-location',
      },
    },
  });

  try {
    // Get all posts with location_address
    console.log('📥 Fetching posts with location data...');
    const { data: posts, error: postsErr } = await sb
      .from('posts')
      .select('id, location_address')
      .not('location_address', 'is', null)
      .neq('location_address', '');

    if (postsErr) {
      console.error('❌ Error fetching posts:', postsErr);
      process.exit(1);
    }

    console.log(`📊 Found ${posts.length} posts with location data`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const post of posts) {
      const { id, location_address } = post;

      // Extract city and country
      const city = (() => {
        const parts = location_address.split(',').map(p => p.trim());
        if (parts.length <= 2) return location_address; // already city, country
        const country = parts[parts.length - 1];
        let extractedCity = null;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!/^\d+$/.test(part) && // not just numbers
              !/^\d{5,}$/.test(part) && // not zip codes
              !part.toLowerCase().includes('county') &&
              !part.toLowerCase().includes('municipality') &&
              !part.toLowerCase().includes('eldership') &&
              !part.toLowerCase().includes('seniūnija') &&
              !part.toLowerCase().includes('g.') &&
              !part.toLowerCase().includes('street') &&
              !part.toLowerCase().includes('avenue') &&
              !part.toLowerCase().includes('straße') &&
              !part.toLowerCase().includes('bavaria') &&
              part.length > 1) {
            extractedCity = part;
          }
        }
        return extractedCity ? `${extractedCity}, ${country}` : location_address;
      })();

      if (!city) {
        console.log(`⚠️  Skipping post ${id}: could not extract city from "${location_address}"`);
        skippedCount++;
        continue;
      }

      // Check if it's already just the city
      if (city === location_address.trim()) {
        console.log(`⏭️  Skipping post ${id}: already contains only city "${city}"`);
        skippedCount++;
        continue;
      }

      // Update the post
      if (isDryRun) {
        console.log(`📝 Would update post ${id}: "${location_address}" → "${city}"`);
        updatedCount++;
      } else {
        const { error: updateErr } = await sb
          .from('posts')
          .update({ location_address: city })
          .eq('id', id);

        if (updateErr) {
          console.error(`❌ Error updating post ${id}:`, updateErr);
        } else {
          console.log(`✅ Updated post ${id}: "${location_address}" → "${city}"`);
          updatedCount++;
        }
      }
    }

    console.log(`\n🎉 Cleanup complete!`);
    if (isDryRun) {
      console.log(`📊 Would update ${updatedCount} posts`);
    } else {
      console.log(`📊 Updated ${updatedCount} posts`);
    }
    console.log(`⏭️  Skipped ${skippedCount} posts (already clean or unparseable)`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

main().catch(console.error);