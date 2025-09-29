export type User = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio?: string;
  joinedAt: string;
  following?: string[];
  favorites?: string[];
};

export type Post = {
  id: string;
  userId: string;
  // Support one or more images. Older data may still include `imageUrl`.
  imageUrls?: string[];
  // legacy single-image field (optional)
  imageUrl?: string;
  // For accessibility: either a single alt for the primary image or an array matching imageUrls
  alt?: string | string[];
  caption: string;
  createdAt: string;
  public: boolean;
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
};

export type CalendarStats = { counts: Record<string, number>, mine: Set<string> };

export interface Api {
  init(): Promise<void>;
  seed(data: { users: User[]; posts: Post[]; comments: Comment[] }): Promise<void>;

  getUsers(): Promise<User[]>;
  getCurrentUser(): Promise<User | null>;
  loginAs(userId: string): Promise<User | null>;

  follow(userId: string): Promise<void>;
  unfollow(userId: string): Promise<void>;
  isFollowing(userId: string): Promise<boolean>;

  // favorites
  favoritePost(postId: string): Promise<void>;
  unfavoritePost(postId: string): Promise<void>;
  isFavorite(postId: string): Promise<boolean>;
  getFavoritePosts(): Promise<HydratedPost[]>;

  getExploreFeed(): Promise<HydratedPost[]>;
  getFollowingFeed(): Promise<HydratedPost[]>;
  getUserPosts(userId: string): Promise<HydratedPost[]>;
  getUser(id: string): Promise<User | null>;

  updateUser(id: string, patch: Partial<User>): Promise<User>;
  updateCurrentUser(patch: Partial<User>): Promise<User>;

  getPostsByDate(dateKey: string): Promise<HydratedPost[]>;
  getPost(id: string): Promise<HydratedPost | null>;

  canPostToday(): Promise<{ allowed: boolean; reason?: string }>;
  // Accept either a single `imageUrl` (legacy) or `imageUrls` (array up to 5 urls).
  createOrReplaceToday(input: { imageUrl?: string; imageUrls?: string[]; caption?: string; alt?: string | string[]; replace?: boolean; public?: boolean }): Promise<HydratedPost>;

  updatePost(id: string, patch: { caption?: string; alt?: string; public?: boolean }): Promise<HydratedPost>;
  deletePost(id: string): Promise<boolean>;

  getComments(postId: string): Promise<(Comment & { user: User | {} })[]>;
  addComment(postId: string, text: string): Promise<Comment & { user: User }>;

  // sign out the current user (client-side)
  signOut(): Promise<void>;

  calendarStats(opts: { year: number; monthIdx: number }): Promise<CalendarStats>;
}