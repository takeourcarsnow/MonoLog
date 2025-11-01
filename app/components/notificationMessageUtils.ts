import { api } from "@/src/lib/api";
import type { Notification } from "@/src/lib/types";
import { getPost } from '@/src/lib/api/posts/post';
import { getUser } from '@/src/lib/api/users';
import { getThread } from '@/src/lib/api/communities/threads';

export async function getNotificationMessage(notification: Notification): Promise<{ message: string; href?: string; imageUrl?: string; actorAvatarUrl?: string }> {
  try {
    let actorUsername = 'Someone';
    let actorAvatarUrl: string | undefined = undefined;
    if (notification.actor_id) {
      const actor = await getUser(notification.actor_id);
      if (actor && actor.username) {
        actorUsername = '@' + actor.username;
        actorAvatarUrl = actor.avatarUrl;
      }
    }

    switch (notification.type) {
      case 'comment': {
        let href: string | undefined = undefined;
        let imageUrl: string | undefined = undefined;
        let isOwnPost = false;
        if (notification.post_id) {
          try {
            const p = await getPost(notification.post_id);
            if (p && p.user && (p.user.username || p.user.id)) {
              const userPiece = p.user.username || p.user.id;
              href = `/post/${userPiece}-${p.id.slice(0,8)}`;
            } else {
              href = `/post/${p?.id || notification.post_id}`;
            }
            if (p && p.imageUrls && p.imageUrls.length > 0) {
              imageUrl = p.imageUrls[0];
            }
            if (p && p.userId) {
              const currentUser = await api.getCurrentUser();
              isOwnPost = !!(currentUser && currentUser.id === p.userId);
            }
          } catch (e) {
            href = `/post/${notification.post_id}`;
          }
        }
        return {
          message: `${actorUsername} commented on ${isOwnPost ? 'your' : 'a'} post${notification.text ? `:\n\n${notification.text.slice(0, 100)}${notification.text.length > 100 ? '...' : ''}` : ''}`,
          href,
          imageUrl,
          actorAvatarUrl
        };
      }
      case 'thread_reply': {
        return {
          message: `${actorUsername} replied to your thread${notification.text ? `:\n\n${notification.text.slice(0, 100)}${notification.text.length > 100 ? '...' : ''}` : ''}`,
          actorAvatarUrl
        };
      }
      case 'follow': {
        return { message: `${actorUsername} followed you`, actorAvatarUrl };
      }
      case 'favorite': {
        let href: string | undefined = undefined;
        let imageUrl: string | undefined = undefined;
        let isOwnPost = false;
        if (notification.post_id) {
          try {
            const p = await getPost(notification.post_id);
            if (p && p.user) {
              const userPiece = p.user.username || p.user.id;
              href = `/post/${userPiece}-${p.id.slice(0,8)}`;
            } else {
              href = `/post/${p?.id || notification.post_id}`;
            }
            if (p && p.imageUrls && p.imageUrls.length > 0) {
              imageUrl = p.imageUrls[0];
            }
            if (p && p.userId) {
              const currentUser = await api.getCurrentUser();
              isOwnPost = !!(currentUser && currentUser.id === p.userId);
            }
          } catch (e) {
            href = `/post/${notification.post_id}`;
          }
        }
        return {
          message: `${actorUsername} favorited ${isOwnPost ? 'your' : 'a'} post`,
          href,
          imageUrl,
          actorAvatarUrl
        };
      }
      case 'community_created': {
        return {
          message: `${actorUsername} created a new community`,
          actorAvatarUrl
        };
      }
      case 'thread_created': {
        let href: string | undefined = undefined;
        if (notification.thread_id) {
          try {
            const thread = await getThread(notification.thread_id);
            if (thread && thread.community && thread.slug) {
              href = `/communities/${thread.community.slug}/thread/${thread.slug}`;
            }
          } catch (e) {
            href = `/communities/thread/${notification.thread_id}`;
          }
        }
        return {
          message: `${actorUsername} created a new thread: ${notification.text?.replace('Created a new thread: ', '') || 'New thread'}`,
          href,
          actorAvatarUrl
        };
      }
      case 'mention': {
        let href: string | undefined = undefined;
        let imageUrl: string | undefined = undefined;
        if (notification.post_id) {
          try {
            const p = await getPost(notification.post_id);
            if (p && p.user) {
              const userPiece = p.user.username || p.user.id;
              href = `/post/${userPiece}-${p.id.slice(0,8)}`;
            } else {
              href = `/post/${p?.id || notification.post_id}`;
            }
            if (p && p.imageUrls && p.imageUrls.length > 0) {
              imageUrl = p.imageUrls[0];
            }
          } catch (e) {
            href = `/post/${notification.post_id}`;
          }
        }
        return {
          message: `${actorUsername} mentioned you in a post`,
          href,
          imageUrl,
          actorAvatarUrl
        };
      }
      case 'post_after_break': {
        let href: string | undefined = undefined;
        let imageUrl: string | undefined = undefined;
        if (notification.post_id) {
          try {
            const p = await getPost(notification.post_id);
            if (p && p.user) {
              const userPiece = p.user.username || p.user.id;
              href = `/post/${userPiece}-${p.id.slice(0,8)}`;
            } else {
              href = `/post/${p?.id || notification.post_id}`;
            }
            if (p && p.imageUrls && p.imageUrls.length > 0) {
              imageUrl = p.imageUrls[0];
            }
          } catch (e) {
            href = `/post/${notification.post_id}`;
          }
        }
        return {
          message: `${actorUsername} resumed posting after a break`,
          href,
          imageUrl,
          actorAvatarUrl
        };
      }
      default: {
        return { message: `You have a new ${notification.type} notification`, actorAvatarUrl };
      }
    }
  } catch (e) {
    return { message: `You have a new ${notification.type} notification` };
  }
}