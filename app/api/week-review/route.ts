import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/src/lib/api/serverSupabase';
import { getUserFromAuthHeader } from '@/src/lib/api/serverVerifyAuth';
import { apiError, apiSuccess } from '@/lib/apiResponse';

export async function GET(req: Request) {
  try {
    const authUser = await getUserFromAuthHeader(req);
    if (!authUser) {
      return apiError('Unauthorized', 401);
    }

    const sb = getServiceSupabase();
    const userId = authUser.id;

    // Get the date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString();

    // Fetch posts from the last 7 days with comment counts
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
      console.error('Week review API error:', error);
      return apiError(error.message, 500);
    }

    // Fetch comments made by the user in the past week
    const { data: userComments, error: commentsError } = await sb
      .from('comments')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', startDate);

    if (commentsError) {
      console.error('Week review comments error:', commentsError);
      // Continue without comments count rather than failing
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

    // Get recent posts organized by weekday
    const postsByWeekday = posts?.reduce((acc, post) => {
      const date = new Date(post.created_at);
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
      // Keep only the most recent post for each weekday
      if (!acc[weekday] || new Date(post.created_at) > new Date(acc[weekday].created_at)) {
        acc[weekday] = post;
      }
      return acc;
    }, {} as Record<string, any>) || {};

    // Order weekdays from Monday to Sunday
    const weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const recentPosts = weekdayOrder
      .filter(day => postsByWeekday[day])
      .map(day => postsByWeekday[day])
      .slice(0, 7); // Limit to 7 days max

    const weekReview = {
      totalPosts,
      totalImages,
      commentsMade,
      spotifyLinks,
      recentPosts,
      postsByDay,
      weekStart: startDate,
      weekEnd: new Date().toISOString()
    };

    return apiSuccess(weekReview);
  } catch (e: any) {
    console.error('Week review API exception:', e);
    return apiError(e?.message || String(e), 500);
  }
}