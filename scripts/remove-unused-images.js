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

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Configuration
const BUCKET_NAME = 'posts';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const verbose = args.includes('--verbose') || dryRun;

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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
  const usedPostsPaths = new Set();
  const usedAvatarPaths = new Set();
  const usedCommunityPaths = new Set();
  const usedStoryPaths = new Set();
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

  // Helper to add paths from URL or array of URLs to a set
  const addPathsToSet = (urls, set) => {
    if (!urls) return;
    const urlArray = Array.isArray(urls) ? urls : [urls];
    urlArray.forEach(url => {
      const path = extractPath(url);
      if (path) set.add(path);
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
      addPathsToSet(post.image_urls, usedPostsPaths);
      addPathsToSet(post.image_url, usedPostsPaths);
      addPathsToSet(post.thumbnail_urls, usedPostsPaths);
      addPathsToSet(post.thumbnail_url, usedPostsPaths);
    });

    // Get user avatars
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('avatar_url');

    if (usersError) throw usersError;

    users.forEach(user => {
      addPathsToSet(user.avatar_url, usedAvatarPaths);
    });

    // Get community images
    const { data: communities, error: communitiesError } = await supabase
      .from('communities')
      .select('image_url');

    if (communitiesError) throw communitiesError;

    communities.forEach(community => {
      addPathsToSet(community.image_url, usedCommunityPaths);
    });

    // Get stories images
    const { data: allStories, error: storiesError } = await supabase
      .from('stories')
      .select('media_url, thumbnail_url, expires_at');

    if (storiesError) throw storiesError;

    const now = new Date().toISOString();
    const stories = allStories.filter(story => story.expires_at > now);

    console.log(`Found ${allStories.length} total stories`);
    if (allStories.length > 0) {
      console.log('Sample story expires_at:', allStories[0].expires_at);
      console.log('Current time ISO:', now);
    }
    console.log(`Found ${stories.length} non-expired stories`);

    stories.forEach(story => {
      addPathsToSet(story.media_url, usedStoryPaths);
      addPathsToSet(story.thumbnail_url, usedStoryPaths);
    });

    // Combine all used paths
    const usedPaths = new Set([...usedPostsPaths, ...usedAvatarPaths, ...usedCommunityPaths, ...usedStoryPaths]);

    if (verbose) console.log(`✅ Found ${usedPaths.size} unique image paths in use`);

    return { usedPaths, usedPostsPaths, usedAvatarPaths, usedCommunityPaths, usedStoryPaths };
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
          allFiles.push({ path: fullPath, size: item.metadata.size || 0 });
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
  const bucketPaths = new Set(bucketFiles.map(f => f.path));
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

async function deleteUnusedImages(usedPaths, bucketFiles, usedPostsPaths, usedAvatarPaths, usedCommunityPaths, usedStoryPaths) {
  let unusedFiles = bucketFiles.filter(file => !usedPaths.has(file.path));

  // Categorize files
  const totalPostsImages = bucketFiles.filter(f => !f.path.startsWith('avatars/') && !f.path.startsWith('stories/')).length;
  const totalAvatars = bucketFiles.filter(f => f.path.startsWith('avatars/')).length;
  const totalStoryImages = bucketFiles.filter(f => f.path.startsWith('stories/')).length;

  const unusedPostsImages = unusedFiles.filter(f => !f.path.startsWith('avatars/') && !f.path.startsWith('stories/')).length;
  const unusedAvatars = unusedFiles.filter(f => f.path.startsWith('avatars/')).length;
  const unusedStoryImages = unusedFiles.filter(f => f.path.startsWith('stories/')).length;

  // Calculate total unused size
  const totalUnusedSize = unusedFiles.reduce((sum, file) => sum + file.size, 0);

  // Calculate sizes
  const totalSize = bucketFiles.reduce((sum, file) => sum + file.size, 0);
  const usedSize = bucketFiles.filter(file => usedPaths.has(file.path)).reduce((sum, file) => sum + file.size, 0);

  // Category sizes
  const postsFiles = bucketFiles.filter(f => !f.path.startsWith('avatars/') && !f.path.startsWith('stories/'));
  const postsUsedSize = postsFiles.filter(f => usedPaths.has(f.path)).reduce((sum, f) => sum + f.size, 0);
  const postsUnusedSize = postsFiles.filter(f => !usedPaths.has(f.path)).reduce((sum, f) => sum + f.size, 0);
  const postsTotalSize = postsFiles.reduce((sum, f) => sum + f.size, 0);

  const avatarFiles = bucketFiles.filter(f => f.path.startsWith('avatars/'));
  const avatarUsedSize = avatarFiles.filter(f => usedPaths.has(f.path)).reduce((sum, f) => sum + f.size, 0);
  const avatarUnusedSize = avatarFiles.filter(f => !usedPaths.has(f.path)).reduce((sum, f) => sum + f.size, 0);
  const avatarTotalSize = avatarFiles.reduce((sum, f) => sum + f.size, 0);

  const storyFiles = bucketFiles.filter(f => f.path.startsWith('stories/'));
  const storyUsedSize = storyFiles.filter(f => usedPaths.has(f.path)).reduce((sum, f) => sum + f.size, 0);
  const storyUnusedSize = storyFiles.filter(f => !usedPaths.has(f.path)).reduce((sum, f) => sum + f.size, 0);
  const storyTotalSize = storyFiles.reduce((sum, f) => sum + f.size, 0);

  const communityUsedSize = bucketFiles.filter(f => usedCommunityPaths.has(f.path)).reduce((sum, f) => sum + f.size, 0);

  // Always show detailed summary
  console.log(`\n📊 Detailed Summary:`);
  console.log(`   Overall - Total files: ${bucketFiles.length}, Total size: ${formatBytes(totalSize)}, Used: ${usedPaths.size}, Used size: ${formatBytes(usedSize)}, Unused: ${unusedFiles.length}, Unused size: ${formatBytes(totalUnusedSize)}`);
  console.log(``);
  console.log(`   Posts images - Total: ${totalPostsImages}, Total size: ${formatBytes(postsTotalSize)}, Used: ${usedPostsPaths.size}, Used size: ${formatBytes(postsUsedSize)}, Unused: ${unusedPostsImages}, Unused size: ${formatBytes(postsUnusedSize)}, Kept: ${usedPostsPaths.size}`);
  console.log(`   Avatars - Total: ${totalAvatars}, Total size: ${formatBytes(avatarTotalSize)}, Used: ${usedAvatarPaths.size}, Used size: ${formatBytes(avatarUsedSize)}, Unused: ${unusedAvatars}, Unused size: ${formatBytes(avatarUnusedSize)}, Kept: ${usedAvatarPaths.size}`);
  console.log(`   Community images - Used: ${usedCommunityPaths.size}, Used size: ${formatBytes(communityUsedSize)}, Kept: ${usedCommunityPaths.size}`);
  console.log(`   Story images - Total: ${totalStoryImages}, Total size: ${formatBytes(storyTotalSize)}, Used: ${usedStoryPaths.size}, Used size: ${formatBytes(storyUsedSize)}, Unused: ${unusedStoryImages}, Unused size: ${formatBytes(storyUnusedSize)}, Kept: ${usedStoryPaths.size}`);

  if (unusedFiles.length === 0) {
    console.log('\n🎉 No unused images found!');
    return;
  }

  if (dryRun) {
    console.log('\n🔍 Dry run - would delete the following files:');
    unusedFiles.forEach(file => console.log(`   ${file.path}`));
    return;
  }

  console.log(`\n🗑️  Deleting ${unusedFiles.length} unused images...`);

  // Delete in batches to avoid rate limits
  const batchSize = 50;
  let deleted = 0;
  let errors = 0;

  for (let i = 0; i < unusedFiles.length; i += batchSize) {
    const batch = unusedFiles.slice(i, i + batchSize).map(file => file.path);

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

    const { usedPaths, usedPostsPaths, usedAvatarPaths, usedCommunityPaths, usedStoryPaths } = await getUsedImagePaths();
    const bucketFiles = await getBucketFiles();

    const missingPaths = await checkMissingImages(usedPaths, bucketFiles);

    if (!dryRun && missingPaths.length > 0) {
      await restoreMissingAvatars(missingPaths);
    }

    await deleteUnusedImages(usedPaths, bucketFiles, usedPostsPaths, usedAvatarPaths, usedCommunityPaths, usedStoryPaths);

    console.log('\n✅ Cleanup completed successfully!');
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  }
}

main();