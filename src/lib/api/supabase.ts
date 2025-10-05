import { getExploreFeed, getExploreFeedPage, getFollowingFeed, getFollowingFeedPage, getUserPosts, getPostsByDate, getPost, updatePost, deletePost, canPostToday, createOrReplaceToday } from "./supabase-posts";
import { getSupabaseClient, getSupabaseClientRaw } from "./supabase-client";
import { getUsers, getCurrentUser, loginAs, getUser, getUserByUsername, updateUser, updateCurrentUser, signOut } from "./supabase-users";
import { follow, unfollow, isFollowing } from "./supabase-follows";
import { favoritePost, unfavoritePost, isFavorite, getFavoritePosts } from "./supabase-favorites";
import { getComments, addComment } from "./supabase-comments";
import { calendarStats } from "./supabase-calendar";
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
  favoritePost,
  unfavoritePost,
  isFavorite,
  getFavoritePosts,
  getExploreFeed,
  getFollowingFeed,
  getExploreFeedPage,
  getFollowingFeedPage,
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
  calendarStats,
};

// Re-export client accessors for direct use by components
export { getSupabaseClient, getSupabaseClientRaw };
