import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/lib/api/serverVerifyAuth';
import { apiError, apiSuccess } from '@/lib/apiResponse';
import { withHandler } from '@/lib/api/withHandler';

export const GET = withHandler({ method: 'GET' })(async (req, ctx) => {
  const authUser = await getUserFromAuthHeader(req);
  if (!authUser) {
    return apiError('Unauthorized', 401);
  }

  const sb = getServiceSupabase();
  const userId = authUser.id;

  // Get the date 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString();

  // Fetch posts from the last 30 days with comment counts
  const { data: posts, error } = await sb
    .from('posts')
    .select(`
      id,
      created_at,
      caption,
      image_urls,
      image_url,
      thumbnail_urls,
      thumbnail_url,
      spotify_link,
      comments!left(id)
    `)
    .eq('user_id', userId)
    .gte('created_at', startDate)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Month review API error:', error);
    return apiError(error.message, 500);
  }

  // Fetch comments made by the user in the past month
  const { data: userComments, error: commentsError } = await sb
    .from('comments')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', startDate);

  if (commentsError) {
    console.error('Month review comments error:', commentsError);
    // Continue without comments count rather than failing
  }

  // Fetch communities joined in the past month
  const { data: communityMemberships, error: membershipsError } = await sb
    .from('community_members')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', startDate);

  if (membershipsError) {
    console.error('Month review memberships error:', membershipsError);
  }

  // Fetch threads created in the past month
  const { data: threads, error: threadsError } = await sb
    .from('threads')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', startDate);

  if (threadsError) {
    console.error('Month review threads error:', threadsError);
  }

  // Fetch stories created in the past month
  const { data: stories, error: storiesError } = await sb
    .from('stories')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', startDate);

  if (storiesError) {
    console.error('Month review stories error:', storiesError);
  }

  // Calculate statistics
  const totalPosts = posts?.length || 0;
  const postsByDay = posts?.reduce((acc, post) => {
    const day = new Date(post.created_at).toDateString();
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalImages = posts?.reduce((sum, post) => {
    const imageCount = Array.isArray(post.image_urls) ? post.image_urls.length :
                      post.image_url ? 1 : 0;
    return sum + imageCount;
  }, 0) || 0;

  const commentsMade = userComments?.length || 0;
  const spotifyLinks = posts?.filter(post => post.spotify_link).length || 0;
  const communitiesJoined = communityMemberships?.length || 0;
  const threadsCreated = threads?.length || 0;
  const storiesCreated = stories?.length || 0;

  // Debug output: helpful when investigating mismatched counts. Log lengths
  // and a few example ids for each resource so we can verify whether deleted
  // items are being counted unintentionally.
  try {
    console.debug('[month-review] counts', {
      totalPosts: posts?.length || 0,
      samplePostIds: (posts || []).slice(0, 5).map((p: any) => p.id),
      commentsMade: userComments?.length || 0,
      sampleCommentIds: (userComments || []).slice(0, 5).map((c: any) => c.id),
      communitiesJoined: communityMemberships?.length || 0,
      sampleCommunityMemberIds: (communityMemberships || []).slice(0, 5).map((m: any) => m.id),
      threadsCreated: threads?.length || 0,
      sampleThreadIds: (threads || []).slice(0, 5).map((t: any) => t.id),
      storiesCreated: stories?.length || 0,
      sampleStoryIds: (stories || []).slice(0, 5).map((s: any) => s.id),
    });
  } catch (e) {
    // ignore logging errors
  }

  // Calculate average posts per day
  const daysInMonth = 30;
  const averagePostsPerDay = totalPosts / daysInMonth;

  // Find most active day
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const postsByDayOfWeek = posts?.reduce((acc, post) => {
    const dayOfWeek = new Date(post.created_at).getDay();
    acc[dayOfWeek] = (acc[dayOfWeek] || 0) + 1;
    return acc;
  }, {} as Record<number, number>) || {};

  const mostActiveDayIndex = Object.keys(postsByDayOfWeek).reduce((max, day) =>
    postsByDayOfWeek[Number(day)] > postsByDayOfWeek[max] ? Number(day) : max, 0);
  const mostActiveDay = dayNames[mostActiveDayIndex];

  // Group posts by week
  const postsByWeek = posts?.reduce((acc, post) => {
    const date = new Date(post.created_at);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    const weekKey = weekStart.toISOString().split('T')[0];
    acc[weekKey] = (acc[weekKey] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Get recent posts - take the most recent 10
  const recentPosts = posts?.slice(0, 10) || [];

  // Flatten all images from posts in the month into a single list so the
  // client can offer a "Top 10" album picker. Each entry includes the
  // parent post id, the image url, thumbnail (if available), created_at
  // and a simple engagement score (number of comments) for basic ranking.
  const monthImages = (posts || []).flatMap((post: any) => {
    const images: string[] = Array.isArray(post.image_urls) ? post.image_urls : (post.image_url ? [post.image_url] : []);
    const thumbs: string[] = Array.isArray(post.thumbnail_urls) ? post.thumbnail_urls : (post.thumbnail_url ? [post.thumbnail_url] : []);
    const score = Array.isArray(post.comments) ? post.comments.length : 0;
    return images.map((img: string, idx: number) => ({
      id: `${post.id}:${idx}`,
      postId: post.id,
      imageUrl: img,
      thumbnailUrl: thumbs[idx] || thumbs[0] || null,
      created_at: post.created_at,
      score,
    }));
  });

  // Calculate average time of day (UTC-based) across posts in minutes since midnight
  let averagePostTimeMinutes: number | null = null;
  let averagePostTime: string | null = null;
  if (posts && posts.length > 0) {
    const minutesArray = posts.map(p => {
      const d = new Date(p.created_at);
      // use UTC hours/minutes to avoid server-local timezone confusion
      return d.getUTCHours() * 60 + d.getUTCMinutes();
    });
    const sum = minutesArray.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / minutesArray.length) % (24 * 60);
    averagePostTimeMinutes = avg;

    // Format into human-friendly 12-hour string (UTC-based)
    const hour = Math.floor(avg / 60);
    const minute = avg % 60;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    let hour12 = hour % 12;
    if (hour12 === 0) hour12 = 12;
    const minuteStr = minute.toString().padStart(2, '0');
    averagePostTime = `${hour12}:${minuteStr} ${suffix}`;
  }

  const monthReview = {
    totalPosts,
    totalImages,
    commentsMade,
    spotifyLinks,
    communitiesJoined,
    threadsCreated,
    storiesCreated,
    averagePostsPerDay: Math.round(averagePostsPerDay * 100) / 100,
    mostActiveDay,
    recentPosts,
    postsByWeek,
    monthStart: startDate,
    monthEnd: new Date().toISOString()
    ,
    averagePostTime,
    averagePostTimeMinutes,
    monthImages
  };

  return apiSuccess(monthReview);
});