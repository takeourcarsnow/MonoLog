import { getExploreFeed, getExploreFeedPage, getFollowingFeed, getFollowingFeedPage, getUserPosts, getPostsByDate, getPost, updatePost, deletePost, canPostToday, createOrReplaceToday } from "./posts";
import { getSupabaseClient, getSupabaseClientRaw } from "./client";
import { getUsers, getCurrentUser, loginAs, getUser, getUserByUsername, updateUser, updateCurrentUser, signOut, deleteCurrentUser } from "./users";
import { follow, unfollow, isFollowing, getFollowingUsers } from "./follows";
import { favoritePost, unfavoritePost, isFavorite, getFavoritePosts } from "./favorites";
import { getComments, addComment } from "./comments";
import { calendarStats } from "./calendar";
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
};

// Re-export client accessors for direct use by components
export { getSupabaseClient, getSupabaseClientRaw };
