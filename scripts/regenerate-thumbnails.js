const path = require('path');
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const fs = require('fs');

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.error('Please ensure they are set in .env.local');
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseServiceKey);

async function generateThumbnail(imageBuffer, mime) {
  try {
    // Generate thumbnail with max 700px edge (reduced by 30% from 1000px), maintaining aspect ratio
    const thumbnail = await sharp(imageBuffer)
      .resize(700, 700, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    return thumbnail;
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    // Fallback: return original buffer if thumbnail generation fails
    return imageBuffer;
  }
}

async function regenerateThumbnails() {
  console.log('Starting thumbnail regeneration...');

  // Fetch all posts with image_urls
  const { data: posts, error } = await sb
    .from('posts')
    .select('id, user_id, image_urls, thumbnail_urls')
    .not('image_urls', 'is', null);

  if (error) {
    console.error('Error fetching posts:', error);
    return;
  }

  console.log(`Found ${posts.length} posts with images`);

  for (const post of posts) {
    const imageUrls = Array.isArray(post.image_urls) ? post.image_urls : [post.image_urls];
    const thumbnailUrls = Array.isArray(post.thumbnail_urls) ? post.thumbnail_urls : [];

    const newThumbnailUrls = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      if (!imageUrl || !imageUrl.includes('/storage/v1/object/public/posts/')) continue;

      // Extract path from URL
      const urlParts = imageUrl.split('/storage/v1/object/public/posts/');
      if (urlParts.length < 2) continue;
      const imagePath = urlParts[1];

      // Download the full image
      const { data: imageData, error: downloadError } = await sb.storage
        .from('posts')
        .download(imagePath);

      if (downloadError) {
        console.error(`Failed to download ${imagePath}:`, downloadError);
        // Keep existing thumbnail if available
        newThumbnailUrls.push(thumbnailUrls[i] || imageUrl);
        continue;
      }

      // Generate new thumbnail
      const buffer = Buffer.from(await imageData.arrayBuffer());
      const mime = 'image/jpeg'; // Assume JPEG for simplicity
      const thumbBuffer = await generateThumbnail(buffer, mime);

      // Determine thumbnail path
      const fileName = path.basename(imagePath);
      const thumbName = fileName.replace(/\.[^.]+$/, '_thumb.jpg');
      const thumbPath = path.join(path.dirname(imagePath), thumbName);

      // Upload new thumbnail
      const { error: uploadError } = await sb.storage
        .from('posts')
        .update(thumbPath, thumbBuffer, {
          upsert: true,
          contentType: 'image/jpeg',
          // Set long-lived cache headers for versioned thumbnails so CDNs/browsers
          // can cache them aggressively and reduce origin egress.
          // Supabase storage accepts cacheControl as a string or number depending on client;
          // this value tells the origin to allow public caching for 1 year and mark immutable.
          cacheControl: 'public, max-age=31536000, immutable'
        });

      if (uploadError) {
        console.error(`Failed to upload thumbnail ${thumbPath}:`, uploadError);
        // Keep existing thumbnail if available
        newThumbnailUrls.push(thumbnailUrls[i] || imageUrl);
        continue;
      }

      // Generate new thumbnail URL
      const baseUrl = `${supabaseUrl}/storage/v1/object/public/posts/`;
      const newThumbUrl = `${baseUrl}${thumbPath}`;
      newThumbnailUrls.push(newThumbUrl);

      console.log(`Regenerated thumbnail for ${imagePath}`);
    }

    // Update the post with new thumbnail URLs
    const { error: updateError } = await sb
      .from('posts')
      .update({ thumbnail_urls: newThumbnailUrls })
      .eq('id', post.id);

    if (updateError) {
      console.error(`Failed to update post ${post.id}:`, updateError);
    } else {
      console.log(`Updated post ${post.id}`);
    }
  }

  console.log('Thumbnail regeneration completed');
}

// Run the script
regenerateThumbnails().catch(console.error);