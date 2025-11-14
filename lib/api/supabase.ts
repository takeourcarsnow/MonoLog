import { getExploreFeed, getExploreFeedPage, getFollowingFeed, getFollowingFeedPage, getHashtagFeedPage, getUserPosts, getPostsByDate, getPost, updatePost, deletePost, canPostToday, createOrReplaceToday } from "./posts";
import { getSupabaseClient, getSupabaseClientRaw } from "./client";
import { getUsers, getCurrentUser, loginAs, getUser, getUserByUsername, updateUser, updateCurrentUser, signOut, deleteCurrentUser } from "./users";
import { follow, unfollow, isFollowing, getFollowingUsers } from "./follows";
import { favoritePost, unfavoritePost, isFavorite, getFavoritePosts } from "./favorites";
import { getComments, addComment } from "./comments";
import { calendarStats } from "./calendar";
import { weekReviewStats } from "./weekReview";
import { monthReviewStats } from "./monthReview";
import { getCommunities, getCommunity, createCommunity, updateCommunity, joinCommunity, leaveCommunity, deleteCommunity, isCommunityMember, getCommunityThreads, getThread, getThreadBySlug, createThread, updateThread, deleteThread, getThreadReplies, addThreadReply, deleteThreadReply, editThreadReply, hasNewThreads } from "./communities";
import { search } from "./search";
import { createStory, getActiveStoriesForUser, getFollowingStories, getExploreStories, markStoryViewed, deleteStory, likeStory, unlikeStory, isLikedStory } from './stories';
import { getNotifications, markNotificationsRead, getUnreadNotificationsCount, markAllNotificationsRead } from "./notifications";
import type { Api } from "../types";

export const supabaseApi: Api = {
  async init() {
    // No-op for supabase
  },

  async seed() {
    throw new Error("Seeding not supported in supabase mode");
  },

  getUsers,
  getCurrentUser,
  loginAs,
  follow,
  unfollow,
  isFollowing,
  getFollowingUsers,
  favoritePost,
  unfavoritePost,
  isFavorite,
  getFavoritePosts,
  getExploreFeed,
  getFollowingFeed,
  getExploreFeedPage,
  getFollowingFeedPage,
  getHashtagFeedPage,
  getUserPosts,
  getUser,
  getUserByUsername,
  updateUser,
  updateCurrentUser,
  getPostsByDate,
  getPost,
  canPostToday,
  createOrReplaceToday,
  updatePost,
  deletePost,
  getComments,
  addComment,
  signOut,
  deleteCurrentUser,
  calendarStats,
  weekReviewStats,
  monthReviewStats,
  getCommunities,
  getCommunity,
  createCommunity,
  updateCommunity,
  joinCommunity,
  leaveCommunity,
  deleteCommunity,
  isCommunityMember,
  getCommunityThreads,
  getThread,
  getThreadBySlug,
  createThread,
  updateThread,
  deleteThread,
  getThreadReplies,
  addThreadReply,
  deleteThreadReply,
  editThreadReply,
  hasNewThreads,
  search,
  getNotifications,
  markNotificationsRead,
  getUnreadNotificationsCount,
  markAllNotificationsRead,
  // Stories
  getActiveStoriesForUser,
  getFollowingStories,
  getExploreStories,
  createStory,
  markStoryViewed,
  deleteStory,
  likeStory,
  unlikeStory,
  isLikedStory,
};

// Re-export client accessors for direct use by components
export { getSupabaseClient, getSupabaseClientRaw };
