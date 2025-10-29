#!/usr/bin/env node

/**
 * Backfill Comment Notifications Script
 * Creates notifications for existing comments to notify previous commenters
 *
 * Usage:
 *   node scripts/backfill-comment-notifications.js
 */

const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      const value = valueParts.join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        process.env[key.trim()] = value.slice(1, -1);
      } else {
        process.env[key.trim()] = value;
      }
    }
  });
}

const { createClient } = require('@supabase/supabase-js');

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function main() {
  console.log('🚀 Starting backfill of comment notifications...');

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
        'x-application-name': 'monolog-backfill',
      },
    },
  });

  try {
    // Get all comments ordered by post_id, created_at
    console.log('📥 Fetching all comments...');
    const { data: comments, error: commentsErr } = await sb
      .from('comments')
      .select('id, post_id, user_id, text, created_at')
      .order('post_id', { ascending: true })
      .order('created_at', { ascending: true });

    if (commentsErr) {
      console.error('❌ Error fetching comments:', commentsErr);
      process.exit(1);
    }

    console.log(`📊 Found ${comments.length} comments across all posts`);

    // Group by post_id
    const postComments = {};
    for (const comment of comments) {
      if (!postComments[comment.post_id]) {
        postComments[comment.post_id] = [];
      }
      postComments[comment.post_id].push(comment);
    }

    let totalNotifications = 0;
    let processedPosts = 0;

    for (const postId in postComments) {
      const postCommentsList = postComments[postId];
      console.log(`🔄 Processing post ${postId} with ${postCommentsList.length} comments`);

      const previousCommenters = new Set();

      for (let i = 0; i < postCommentsList.length; i++) {
        const comment = postCommentsList[i];
        const currentCommenter = comment.user_id;

        // For comments after the first, notify all previous commenters
        if (i > 0) {
          const notifyUsers = Array.from(previousCommenters).filter(userId => userId !== currentCommenter);

          if (notifyUsers.length > 0) {
            console.log(`  📤 Creating ${notifyUsers.length} notifications for comment ${comment.id}`);

            const notifications = notifyUsers.map(userId => ({
              id: uid(),
              user_id: userId,
              actor_id: currentCommenter,
              post_id: postId,
              type: 'comment',
              text: comment.text.slice(0, 240),
              created_at: comment.created_at,
              read: false,
            }));

            const { error: insertErr } = await sb
              .from('notifications')
              .insert(notifications);

            if (insertErr) {
              console.error(`❌ Error inserting notifications for comment ${comment.id}:`, insertErr);
            } else {
              totalNotifications += notifications.length;
              console.log(`  ✅ Created ${notifications.length} notifications`);
            }
          }
        }

        // Add current commenter to the set for future notifications
        previousCommenters.add(currentCommenter);
      }

      processedPosts++;
    }

    console.log(`\n🎉 Backfill complete!`);
    console.log(`📊 Processed ${processedPosts} posts`);
    console.log(`📤 Created ${totalNotifications} notifications`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}