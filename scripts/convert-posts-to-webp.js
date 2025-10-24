require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Server supabase not configured.');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'monolog-server',
      },
    },
  });
}

async function convertPostsToWebP() {
  const sb = getServiceSupabase();

  // Get all posts with images
  const { data: posts, error } = await sb
    .from('posts')
    .select('id, image_url, image_urls, thumbnail_url, thumbnail_urls, user_id')
    .not('image_url', 'is', null)
    .or('image_urls.not.is.null,image_url.not.is.null');

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  console.log(`Found ${posts.length} posts with images.`);

  for (const post of posts) {
    try {
      const imageUrls = post.image_urls || (post.image_url ? [post.image_url] : []);
      const thumbnailUrls = post.thumbnail_urls || (post.thumbnail_url ? [post.thumbnail_url] : []);

      const newImageUrls = [];
      const newThumbnailUrls = [];

      // Convert main images
      for (const url of imageUrls) {
        const newUrl = await convertImage(url, post.user_id, sb);
        if (newUrl) newImageUrls.push(newUrl);
        else newImageUrls.push(url); // keep old if failed
      }

      // Convert thumbnails
      for (const url of thumbnailUrls) {
        const newUrl = await convertImage(url, post.user_id, sb);
        if (newUrl) newThumbnailUrls.push(newUrl);
        else newThumbnailUrls.push(url);
      }

      // Update post
      const updateObj = {};
      if (newImageUrls.length === 1) updateObj.image_url = newImageUrls[0];
      else if (newImageUrls.length > 1) updateObj.image_urls = newImageUrls;
      if (newThumbnailUrls.length === 1) updateObj.thumbnail_url = newThumbnailUrls[0];
      else if (newThumbnailUrls.length > 1) updateObj.thumbnail_urls = newThumbnailUrls;

      if (Object.keys(updateObj).length > 0) {
        await sb.from('posts').update(updateObj).eq('id', post.id);
        console.log(`Updated post ${post.id}`);
      }
    } catch (err) {
      console.error(`Failed to process post ${post.id}:`, err);
    }
  }

  console.log('Conversion finished.');
}

async function convertImage(url, userId, sb) {
  try {
    // Extract path from URL
    const urlObj = new URL(url);
    const path = urlObj.pathname.split('/storage/v1/object/public/posts/')[1];
    if (!path) return null;

    // Download
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert to WebP
    const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();

    // New path
    const newPath = path.replace(/\.[^.]+$/, '.webp');

    // Upload
    const { error } = await sb.storage.from('posts').upload(newPath, webpBuffer, {
      upsert: true,
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable'
    });

    if (error) throw error;

    // New URL
    const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/posts/`;
    return `${baseUrl}${newPath}`;
  } catch (err) {
    console.error(`Failed to convert ${url}:`, err);
    return null;
  }
}

convertPostsToWebP().catch(console.error);