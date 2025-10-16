import { storage } from "../storage";
import { uid } from "../id";
import { toDateKey, toUTCDateKey } from "../date";
import type { Api, User, Post, Comment, HydratedPost } from "../types";

const KEYS = {
  users: "users",
  posts: "posts",
  comments: "comments",
  currentUserId: "currentUserId",
};

let cache: {
  users: User[];
  posts: Post[];
  comments: Comment[];
  currentUserId: string | null;
} = {
  users: [],
  posts: [],
  comments: [],
  currentUserId: null,
};

let inited = false;

function loadAll() {
  cache.users = storage.get<User[]>(KEYS.users, []);
  cache.posts = storage.get<Post[]>(KEYS.posts, []);
  cache.comments = storage.get<Comment[]>(KEYS.comments, []);
  cache.currentUserId = storage.get<string | null>(KEYS.currentUserId, null);
  if (!cache.currentUserId && cache.users.length) {
    cache.currentUserId = cache.users[0].id;
    persist();
  }
}
function persist() {
  storage.set(KEYS.users, cache.users);
  storage.set(KEYS.posts, cache.posts);
  storage.set(KEYS.comments, cache.comments);
  storage.set(KEYS.currentUserId, cache.currentUserId);
}

function getUserById(id: string | null) {
  if (!id) return null;
  return cache.users.find(u => u.id === id) || null;
}

function hydratePost(post: Post): HydratedPost {
  const user = getUserById(post.userId) || { username: "unknown", avatarUrl: "", id: "unknown", displayName: "unknown" } as any;
  const comments = cache.comments.filter(c => c.postId === post.id);
  // normalize: ensure imageUrls exists for consumers
  const imageUrls = (post as any).imageUrls || ((post as any).imageUrl ? [(post as any).imageUrl] : []);
  const alt = (post as any).alt;
  const spotifyLink = (post as any).spotifyLink || (post as any).spotify_link || undefined;
  return { ...post, imageUrls, alt, user, commentsCount: comments.length } as any;
}

export const localApi: Api = {
  async init() {
    if (inited) return;
    if (typeof window === "undefined") return; // only init on client
    loadAll();
    inited = true;
  },

  async seed({ users, posts, comments }) {
    cache.users = users;
    cache.posts = posts;
    cache.comments = comments;
    cache.currentUserId = users[0]?.id || null;
    persist();
  },

  async getUsers() { return cache.users; },
  async getCurrentUser() { return getUserById(cache.currentUserId); },
  async loginAs(userId: string) { cache.currentUserId = userId; persist(); return getUserById(userId); },

  async follow(userId: string) {
    const me = getUserById(cache.currentUserId);
    if (!me || me.id === userId) return;
    me.following = me.following || [];
    if (!me.following.includes(userId)) me.following.push(userId);
    persist();
  },
  async unfollow(userId: string) {
    const me = getUserById(cache.currentUserId);
    if (!me) return;
    me.following = (me.following || []).filter(id => id !== userId);
    persist();
  },
  async isFollowing(userId: string) {
    const me = getUserById(cache.currentUserId);
    return !!me?.following?.includes(userId);
  },
  async getFollowingUsers(userId?: string) {
    const user = userId ? getUserById(userId) : getUserById(cache.currentUserId);
    if (!user) return [];
    const followingIds = user.following || [];
    return followingIds.map(id => getUserById(id)).filter(Boolean) as User[];
  },

  async favoritePost(postId: string) {
    const me = getUserById(cache.currentUserId);
    if (!me) throw new Error("Not logged in");
    me.favorites = me.favorites || [];
    if (!me.favorites.includes(postId)) {
      me.favorites.push(postId);
      persist();
    }
  },
  async unfavoritePost(postId: string) {
    const me = getUserById(cache.currentUserId);
    if (!me) throw new Error("Not logged in");
    me.favorites = (me.favorites || []).filter(id => id !== postId);
    persist();
  },
  async isFavorite(postId: string) {
    const me = getUserById(cache.currentUserId);
    if (!me) return false;
    return !!me.favorites?.includes(postId);
  },
  async getFavoritePosts() {
    const me = getUserById(cache.currentUserId);
    if (!me) return [];
    const favs = new Set(me.favorites || []);
    return cache.posts.filter(p => favs.has(p.id)).map(hydratePost);
  },

  async getExploreFeed() {
    console.debug("localApi.getExploreFeed called");
    const me = getUserById(cache.currentUserId);
    return cache.posts
      .slice()
      // only include public posts not authored by the current user
      .filter(p => p.public && p.userId !== me?.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(hydratePost);
  },
  async getExploreFeedPage({ limit, before }: { limit: number; before?: string }) {
    const me = getUserById(cache.currentUserId);
    let posts = cache.posts
      .slice()
      // only include public posts not authored by the current user
      .filter(p => p.public && p.userId !== me?.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (before) {
      posts = posts.filter(p => new Date(p.createdAt).getTime() < new Date(before).getTime());
    }
    const slice = posts.slice(0, limit);
    return slice.map(hydratePost);
  },
  async getFollowingFeed() {
    const me = getUserById(cache.currentUserId);
    const ids = me?.following || [];
    return cache.posts
      // include public posts from people you follow, and always include your own posts
      .filter(p => (ids.includes(p.userId) && p.public) || p.userId === me?.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(hydratePost);
  },
  async getFollowingFeedPage({ limit, before }: { limit: number; before?: string }) {
    const me = getUserById(cache.currentUserId);
    const ids = me?.following || [];
    let posts = cache.posts
      // include public posts from people you follow, and always include your own posts
      .filter(p => (ids.includes(p.userId) && p.public) || p.userId === me?.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (before) {
      posts = posts.filter(p => new Date(p.createdAt).getTime() < new Date(before).getTime());
    }
    const slice = posts.slice(0, limit);
    return slice.map(hydratePost);
  },
  async getUserPosts(userId: string) {
    const me = getUserById(cache.currentUserId);
    return cache.posts
      .filter(p => p.userId === userId && (p.public || userId === me?.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(hydratePost);
  },
  async getUser(id: string) { return getUserById(id); },
  async updateUser(id, patch) {
    const u = getUserById(id);
    if (!u) throw new Error("User not found");
    // Merge socialLinks specially to avoid overwriting the whole map with undefined
    if (patch.socialLinks !== undefined) {
      u.socialLinks = Object.assign({}, u.socialLinks || {}, patch.socialLinks || {});
    }
    const clone = Object.assign({}, patch || {});
    delete (clone as any).socialLinks;
    Object.assign(u, clone);
    persist();
    return u;
  },
  async updateCurrentUser(patch) {
    const id = cache.currentUserId;
    if (!id) throw new Error("Not logged in");
    return this.updateUser(id, patch);
  },
  async getPostsByDate(dateKey: string) {
    return cache.posts
      .filter(p => toDateKey(p.createdAt) === dateKey)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(hydratePost);
  },

  async getPost(id: string) {
    const p = cache.posts.find(x => x.id === id);
    return p ? hydratePost(p) : null;
  },

  async canPostToday() {
    try {
      // allow quick local override for testing: set localStorage 'monolog:disableUploadLimit' to '1' or 'true'
      if (typeof window !== 'undefined' && window.localStorage) {
        const v = window.localStorage.getItem('monolog:disableUploadLimit');
        if (v === '1' || v === 'true') return { allowed: true };
      }
    } catch (e) {}
    const me = getUserById(cache.currentUserId);
    if (!me) return { allowed: false, reason: "Not logged in" };
    const today = toDateKey(new Date());
    const todays = cache.posts.filter(p => p.userId === me.id && toDateKey(p.createdAt) === today);
    if (todays.length) {
      // return last posted timestamp and nextAllowedAt at start of next local day
      const myPosts = cache.posts.filter(p => p.userId === me.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const last = myPosts[0];
      if (last) {
        const lastDate = new Date(last.createdAt);
        const nextDay = new Date(lastDate);
        nextDay.setHours(24, 0, 0, 0);
        return { allowed: false, reason: "You already posted today", nextAllowedAt: nextDay.getTime(), lastPostedAt: new Date(last.createdAt).getTime() };
      }
      return { allowed: false, reason: "You already posted today" };
    }
    return { allowed: true };
  },

  async createOrReplaceToday({ imageUrl, imageUrls, caption, alt, spotifyLink, replace = false, public: isPublic = true }: any) {
    const me = getUserById(cache.currentUserId);
    if (!me) throw new Error("Not logged in");
    const now = new Date();
    const todayKey = toDateKey(now);
    const todays = cache.posts.filter(p => p.userId === me.id && toDateKey(p.createdAt) === todayKey);
    if (todays.length && !replace) {
      const err: any = new Error("Already posted today");
      err.code = "LIMIT";
      throw err;
    }
    if (todays.length && replace) {
      for (const p of todays) {
        cache.comments = cache.comments.filter(c => c.postId !== p.id);
      }
      cache.posts = cache.posts.filter(p => !(p.userId === me.id && toDateKey(p.createdAt) === todayKey));
    }
    const post: Post = {
      id: uid(),
      userId: me.id,
      // prefer imageUrls if provided, otherwise fall back to legacy imageUrl
      imageUrls: imageUrls && imageUrls.length ? imageUrls.slice(0, 5) : imageUrl ? [imageUrl] : [],
      alt: alt || "",
      caption: caption || "",
      spotifyLink: (arguments[0] as any)?.spotifyLink || undefined,
      createdAt: now.toISOString(),
      public: !!isPublic,
    };
    cache.posts.push(post);
    persist();
    return hydratePost(post);
  },

  async updatePost(id, patch) {
    const p = cache.posts.find(x => x.id === id);
    if (!p) throw new Error("Post not found");
    if (patch.caption !== undefined) p.caption = patch.caption!;
    if (patch.alt !== undefined) p.alt = patch.alt!;
    if (patch.public !== undefined) p.public = !!patch.public;
    persist();
    return hydratePost(p);
  },

  async deletePost(id) {
    const exists = cache.posts.some(p => p.id === id);
    if (!exists) throw new Error("Post not found");
    cache.comments = cache.comments.filter(c => c.postId !== id);
    cache.posts = cache.posts.filter(p => p.id !== id);
    persist();
    return true;
  },

  async getComments(postId) {
    return cache.comments
      .filter(c => c.postId === postId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(c => ({ ...c, user: getUserById(c.userId) || {} as any }));
  },
  async addComment(postId, text) {
    const me = getUserById(cache.currentUserId);
    if (!me) throw new Error("Not logged in");
    if (!text?.trim()) throw new Error("Empty");
    const comment: Comment = {
      id: uid(),
      postId,
      userId: me.id,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    cache.comments.push(comment);
    persist();
    return { ...comment, user: me };
  },

  async calendarStats({ year, monthIdx }) {
    const map: Record<string, number> = {};
    for (const p of cache.posts) {
      const d = new Date(p.createdAt);
      if (d.getUTCFullYear() === year && d.getUTCMonth() === monthIdx) {
        const dk = toUTCDateKey(d);
        map[dk] = (map[dk] || 0) + 1;
      }
    }
    const me = getUserById(cache.currentUserId);
    const myKeys = new Set(
      cache.posts
        .filter(p => p.userId === me?.id && new Date(p.createdAt).getUTCMonth() === monthIdx && new Date(p.createdAt).getUTCFullYear() === year)
        .map(p => toUTCDateKey(p.createdAt))
    );
    return { counts: map, mine: myKeys };
  },
  async signOut() {
    cache.currentUserId = null;
    persist();
    try {
      if (typeof window !== 'undefined') {
        // mirror the supabase adapter which dispatches this event so
        // UI components can react to auth state changes
        window.dispatchEvent(new CustomEvent('auth:changed'));
      }
    } catch (_) { /* ignore */ }
  },

  async deleteCurrentUser() {
    const me = getUserById(cache.currentUserId);
    if (!me) throw new Error("Not logged in");

    // Delete all posts by this user
    cache.posts = cache.posts.filter(p => p.userId !== me.id);

    // Delete all comments by this user
    cache.comments = cache.comments.filter(c => c.userId !== me.id);

    // Remove this user from other users' following lists
    for (const user of cache.users) {
      if (user.following) {
        user.following = user.following.filter(id => id !== me.id);
      }
    }

    // Remove this user from favorites (though favorites are stored per user)
    for (const user of cache.users) {
      if (user.favorites) {
        user.favorites = user.favorites.filter(id => !cache.posts.some(p => p.id === id && p.userId === me.id));
      }
    }

    // Delete the user
    cache.users = cache.users.filter(u => u.id !== me.id);

    // Clear current user
    cache.currentUserId = null;

    persist();

    // Dispatch auth changed event
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:changed'));
      }
    } catch (_) { /* ignore */ }
  },

  // Communities - stub implementations for local mode
  async getCommunities() { return []; },
  async getCommunity() { return null; },
  async createCommunity() { throw new Error('Communities not supported in local mode'); },
  async joinCommunity() { throw new Error('Communities not supported in local mode'); },
  async leaveCommunity() { throw new Error('Communities not supported in local mode'); },
  async isCommunityMember() { return false; },
  async getCommunityThreads() { return []; },
  async getThread() { return null; },
  async createThread() { throw new Error('Threads not supported in local mode'); },
  async updateThread() { throw new Error('Threads not supported in local mode'); },
  async deleteThread() { throw new Error('Threads not supported in local mode'); },
  async getThreadReplies() { return []; },
  async addThreadReply() { throw new Error('Thread replies not supported in local mode'); },
};
