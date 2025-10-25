#!/usr/bin/env node

/**
 * Script to remove unused images from Supabase storage bucket
 * This script identifies images in the 'posts' bucket that are no longer referenced
 * in the database and removes them to free up storage space.
 *
 * Usage:
 *   node scripts/remove-unused-images.js [--dry-run] [--verbose]
 *
 * Options:
 *   --dry-run: Show what would be deleted without actually deleting
 *   --verbose: Show detailed progress information
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration
const BUCKET_NAME = 'posts';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose') || dryRun;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function getUsedImagePaths() {
  const usedPaths = new Set();
  const baseUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/`;

  // Helper to extract path from URL
  const extractPath = (url) => {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith(baseUrl)) {
      let path = url.slice(baseUrl.length);
      // Remove query parameters
      path = path.split('?')[0];
      return path;
    }
    return null;
  };

  // Helper to add paths from URL or array of URLs
  const addPaths = (urls) => {
    if (!urls) return;
    const urlArray = Array.isArray(urls) ? urls : [urls];
    urlArray.forEach(url => {
      const path = extractPath(url);
      if (path) usedPaths.add(path);
    });
  };

  try {
    if (verbose) console.log('🔍 Collecting used image paths from database...');

    // Get posts images
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('image_urls, image_url, thumbnail_urls, thumbnail_url');

    if (postsError) throw postsError;

    posts.forEach(post => {
      addPaths(post.image_urls);
      addPaths(post.image_url);
      addPaths(post.thumbnail_urls);
      addPaths(post.thumbnail_url);
    });

    // Get user avatars
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('avatar_url');

    if (usersError) throw usersError;

    users.forEach(user => {
      addPaths(user.avatar_url);
    });

    // Get community images
    const { data: communities, error: communitiesError } = await supabase
      .from('communities')
      .select('image_url');

    if (communitiesError) throw communitiesError;

    communities.forEach(community => {
      addPaths(community.image_url);
    });

    if (verbose) console.log(`✅ Found ${usedPaths.size} unique image paths in use`);

    return usedPaths;
  } catch (error) {
    console.error('❌ Error collecting used image paths:', error.message);
    throw error;
  }
}

async function getBucketFiles() {
  try {
    if (verbose) console.log('📂 Listing all files in storage bucket...');

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1000 });

    if (error) throw error;

    // Recursively get all files (Supabase list is not recursive by default)
    const allFiles = [];

    const getAllFiles = async (prefix = '') => {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .list(prefix, { limit: 1000 });

      if (error) throw error;

      for (const item of data) {
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.metadata === null) {
          // It's a folder, recurse
          await getAllFiles(fullPath);
        } else {
          // It's a file
          allFiles.push(fullPath);
        }
      }
    };

    await getAllFiles();

    if (verbose) console.log(`📁 Found ${allFiles.length} files in bucket`);

    return allFiles;
  } catch (error) {
    console.error('❌ Error listing bucket files:', error.message);
    throw error;
  }
}

async function checkMissingImages(usedPaths, bucketFiles) {
  const bucketPaths = new Set(bucketFiles);
  const missingPaths = [];

  for (const path of usedPaths) {
    if (!bucketPaths.has(path)) {
      missingPaths.push(path);
    }
  }

  if (missingPaths.length > 0) {
    console.log(`\n⚠️  Found ${missingPaths.length} images referenced in database but missing from storage:`);
    missingPaths.forEach(path => console.log(`   ${path}`));
    console.log('\nThese images need to be restored. You can:');
    console.log('1. Re-upload them via the profile page');
    console.log('2. Restore from a backup if available');
    console.log('3. Contact Supabase support if recently deleted');
  } else {
    console.log('\n✅ All referenced images are present in storage');
  }

  return missingPaths;
}

async function restoreMissingAvatars(missingPaths) {
  if (missingPaths.length === 0) return;

  console.log('\n🔄 Restoring missing avatars by setting them to default...');

  // Extract user IDs from avatar paths
  const userIds = missingPaths
    .filter(path => path.startsWith('avatars/'))
    .map(path => {
      const parts = path.split('/');
      return parts[1]; // userId is the second part
    })
    .filter(id => id); // remove empty

  if (userIds.length === 0) {
    console.log('No avatar paths found to restore');
    return;
  }

  console.log(`Found ${userIds.length} users with missing avatars`);

  // Update each user's avatar_url to default
  let updated = 0;
  let errors = 0;

  for (const userId of userIds) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: '/logo.svg' })
        .eq('id', userId);

      if (error) {
        console.error(`❌ Error updating user ${userId}:`, error.message);
        errors++;
      } else {
        updated++;
        if (verbose) console.log(`✅ Updated user ${userId} to default avatar`);
      }
    } catch (error) {
      console.error(`❌ Error updating user ${userId}:`, error.message);
      errors++;
    }
  }

  console.log(`\n📈 Restore Results:`);
  console.log(`   Successfully updated: ${updated} users`);
  if (errors > 0) {
    console.log(`   Errors: ${errors} users failed`);
  }
}

async function deleteUnusedImages(usedPaths, bucketFiles) {
  const unusedFiles = bucketFiles.filter(file => !usedPaths.has(file));

  if (verbose) {
    console.log(`\n📊 Summary:`);
    console.log(`   Used images: ${usedPaths.size}`);
    console.log(`   Total files in bucket: ${bucketFiles.length}`);
    console.log(`   Unused files: ${unusedFiles.length}`);
  }

  if (unusedFiles.length === 0) {
    console.log('🎉 No unused images found!');
    return;
  }

  if (dryRun) {
    console.log('\n🔍 Dry run - would delete the following files:');
    unusedFiles.forEach(file => console.log(`   ${file}`));
    return;
  }

  console.log(`\n🗑️  Deleting ${unusedFiles.length} unused images...`);

  // Delete in batches to avoid rate limits
  const batchSize = 50;
  let deleted = 0;
  let errors = 0;

  for (let i = 0; i < unusedFiles.length; i += batchSize) {
    const batch = unusedFiles.slice(i, i + batchSize);

    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(batch);

      if (error) {
        console.error(`❌ Error deleting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        errors++;
      } else {
        deleted += batch.length;
        if (verbose) console.log(`✅ Deleted batch ${Math.floor(i / batchSize) + 1} (${batch.length} files)`);
      }
    } catch (error) {
      console.error(`❌ Error deleting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      errors++;
    }
  }

  console.log(`\n📈 Results:`);
  console.log(`   Successfully deleted: ${deleted} files`);
  if (errors > 0) {
    console.log(`   Errors: ${errors} batches failed`);
  }
}

async function main() {
  try {
    console.log('🧹 Starting unused image cleanup...');
    if (dryRun) console.log('🔍 Running in dry-run mode (no files will be deleted)');

    const [usedPaths, bucketFiles] = await Promise.all([
      getUsedImagePaths(),
      getBucketFiles()
    ]);

    const missingPaths = await checkMissingImages(usedPaths, bucketFiles);

    if (!dryRun && missingPaths.length > 0) {
      await restoreMissingAvatars(missingPaths);
    }

    await deleteUnusedImages(usedPaths, bucketFiles);

    console.log('\n✅ Cleanup completed successfully!');
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  }
}

main();