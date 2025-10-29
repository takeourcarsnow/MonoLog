export type User = {
  id: string;
  username: string;
  // optional display name; when absent UI should fall back to `username`
  displayName?: string;
  avatarUrl: string;
  bio?: string;
  // Social links stored as a small map of platform->value (either full url or handle)
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    spotify?: string;
    facebook?: string;
    website?: string;
    [key: string]: string | undefined;
  };
  joinedAt: string;
  following?: string[];
  favorites?: string[];
  usernameChangedAt?: string; // Tracks last username change for 24-hour cooldown
  exifPresets?: {
    cameras?: string[];
    lenses?: string[];
    filmTypes?: string[];
    filmIsos?: string[];
  };
};

export type Post = {
  id: string;
  userId: string;
  // Support one or more images. Older data may still include `imageUrl`.
  imageUrls?: string[];
  // legacy single-image field (optional)
  imageUrl?: string;
  // Thumbnails for grid view optimization
  thumbnailUrls?: string[];
  thumbnailUrl?: string;
  // For accessibility: either a single alt for the primary image or an array matching imageUrls
  alt?: string | string[];
  caption: string;
  hashtags?: string[];
  spotifyLink?: string;
  createdAt: string;
  public: boolean;
  // EXIF data
  camera?: string;
  lens?: string;
  filmType?: string;
};

export type HydratedPost = Post & {
  user: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
  commentsCount: number;
};

export type Comment = {
  id: string;
  postId: string;
  userId: string;
  text: string;
  createdAt: string;
  parentId?: string;
};

export type Community = {
  id: string;
  name: string;
  slug: string;
  description: string;
  creatorId: string;
  createdAt: string;
  imageUrl?: string;
  memberCount?: number;
  threadCount?: number;
};

export type HydratedCommunity = Community & {
  creator: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
  isMember?: boolean;
  lastActivity?: string;
};

export type Thread = {
  id: string;
  communityId: string;
  userId: string;
  title: string;
  slug: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  replyCount?: number;
};

export type HydratedThread = Thread & {
  user: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
  community: Pick<Community, "id" | "name">;
};

export type ThreadReply = {
  id: string;
  threadId: string;
  userId: string;
  content: string;
  createdAt: string;
};

export type HydratedThreadReply = ThreadReply & {
  user: Pick<User, "id" | "username" | "displayName" | "avatarUrl">;
};

export type CalendarStats = { counts: Record<string, number>, mine: string[] };

export type WeekReviewStats = {
  totalPosts: number;
  totalImages: number;
  commentsMade: number;
  spotifyLinks: number;
  recentPosts: Array<{
    id: string;
    created_at: string;
    caption: string;
    image_urls?: string[];
    image_url?: string;
    thumbnail_urls?: string[];
    thumbnail_url?: string;
  }>;
  postsByDay: Record<string, number>;
  weekStart: string;
  weekEnd: string;
};

export type Notification = {
  id: string;
  user_id: string;
  actor_id?: string;
  post_id?: string;
  thread_id?: string;
  type: string;
  text?: string;
  read: boolean;
  created_at: string;
};

export interface Api {
  init(): Promise<void>;
  seed(data: { users: User[]; posts: Post[]; comments: Comment[] }): Promise<void>;

  getUsers(): Promise<User[]>;
  getCurrentUser(): Promise<User | null>;
  loginAs(userId: string): Promise<User | null>;

  follow(userId: string): Promise<void>;
  unfollow(userId: string): Promise<void>;
  isFollowing(userId: string): Promise<boolean>;
  getFollowingUsers(userId?: string): Promise<User[]>;

  // favorites
  favoritePost(postId: string): Promise<void>;
  unfavoritePost(postId: string): Promise<void>;
  isFavorite(postId: string): Promise<boolean>;
  getFavoritePosts(): Promise<HydratedPost[]>;

  getExploreFeed(): Promise<HydratedPost[]>;
  getFollowingFeed(): Promise<HydratedPost[]>;
  // Paginated variants (return newest posts before an optional timestamp).
  getExploreFeedPage(opts: { limit: number; before?: string }): Promise<HydratedPost[]>;
  getFollowingFeedPage(opts: { limit: number; before?: string }): Promise<HydratedPost[]>;
  getHashtagFeedPage(tag: string, opts: { limit: number; before?: string }): Promise<HydratedPost[]>;
  getUserPosts(userId: string): Promise<HydratedPost[]>;
  getUser(id: string): Promise<User | null>;
  getUserByUsername?(username: string): Promise<User | null>;

  updateUser(id: string, patch: Partial<User>): Promise<User>;
  updateCurrentUser(patch: Partial<User>): Promise<User>;

  // delete the current user's account
  deleteCurrentUser(): Promise<void>;
  getPostsByDate(dateKey: string): Promise<HydratedPost[]>;
  getPost(id: string): Promise<HydratedPost | null>;

  // When not allowed, implementations may provide a `nextAllowedAt` timestamp
  // and the `lastPostedAt` timestamp so clients can show a progress/countdown
  // from the last post until when the next calendar day begins.
  canPostToday(): Promise<{ allowed: boolean; reason?: string; nextAllowedAt?: number; lastPostedAt?: number }>;
  // Accept either a single `imageUrl` (legacy) or `imageUrls` (array up to 5 urls).
  createOrReplaceToday(input: { imageUrl?: string; imageUrls?: string[]; caption?: string; alt?: string | string[]; spotifyLink?: string; public?: boolean; camera?: string; lens?: string; filmType?: string }): Promise<HydratedPost>;

  updatePost(id: string, patch: { caption?: string; alt?: string; public?: boolean }): Promise<HydratedPost>;
  deletePost(id: string): Promise<boolean>;

  getComments(postId: string): Promise<(Comment & { user: User | {} })[]>;
  addComment(postId: string, text: string, parentId?: string): Promise<Comment & { user: User }>;

  // Communities
  getCommunities(): Promise<HydratedCommunity[]>;
  getCommunity(slug: string): Promise<HydratedCommunity | null>;
  createCommunity(input: { name: string; description: string; imageUrl?: string }): Promise<HydratedCommunity>;
  updateCommunity(slug: string, input: { name?: string; description?: string; imageUrl?: string }): Promise<HydratedCommunity>;
  joinCommunity(communityId: string): Promise<void>;
  leaveCommunity(communityId: string): Promise<void>;
  deleteCommunity(id: string): Promise<boolean>;
  isCommunityMember(communityId: string): Promise<boolean>;

  // Threads
  getCommunityThreads(communityId: string): Promise<HydratedThread[]>;
  getThread(id: string): Promise<HydratedThread | null>;
  getThreadBySlug(slug: string): Promise<HydratedThread | null>;
  createThread(input: { communityId: string; title: string; content: string }): Promise<HydratedThread>;
  updateThread(id: string, patch: { title?: string; content?: string }): Promise<HydratedThread>;
  deleteThread(id: string): Promise<boolean>;

  // Thread replies
  getThreadReplies(threadId: string): Promise<HydratedThreadReply[]>;
  addThreadReply(threadId: string, content: string): Promise<HydratedThreadReply>;
  deleteThreadReply(id: string): Promise<boolean>;
  editThreadReply(replyId: string, content: string): Promise<HydratedThreadReply>;

  // Check for new threads since timestamp
  hasNewThreads(since: string): Promise<boolean>;

  // sign out the current user (client-side)
  signOut(): Promise<void>;

  calendarStats(opts: { year: number; monthIdx: number; offset: number }): Promise<CalendarStats>;

  // Week review statistics
  weekReviewStats(): Promise<WeekReviewStats>;

  // Notifications
  getNotifications(options?: { limit?: number; before?: string }): Promise<Notification[]>;
  markNotificationsRead(notificationIds: string[]): Promise<void>;

  // Search
  search(query: string): Promise<{ posts: HydratedPost[]; users: User[]; communities: HydratedCommunity[] }>;
}

// Reserved route names that should not be treated as usernames
export const RESERVED_ROUTES = [
  'about', 'api', 'calendar', 'communities', 'explore', 'favorites',
  'feed', 'post', 'profile', 'upload', 'admin',
  'settings', 'help', 'terms', 'privacy', 'login',
  'register', 'signup', 'signin', 'logout', 'auth',
  'week-review', 'hashtags', 'search', 'reset-password', 'offline', 'styles',
  'notifications',
  '_next', '_vercel', 'favicon.ico', 'robots.txt', 'sitemap.xml'
];
