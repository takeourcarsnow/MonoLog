import { api } from "@/lib/api";
import { getClient } from "@/lib/api/client";
import type { Notification } from "@/lib/types";
import { getPost } from '@/lib/api/posts/post';
import { getUser } from '@/lib/api/users';
import { getThread } from '@/lib/api/communities/threads';
import { getActiveStoriesForUser } from '@/lib/api/stories';

async function checkUserHasStory(userId: string): Promise<boolean> {
  try {
    const stories = await getActiveStoriesForUser(userId);
    return stories.length > 0;
  } catch (e) {
    return false;
  }
}

export async function getNotificationMessage(notification: Notification): Promise<{ message: string; href?: string; imageUrl?: string; actorAvatarUrl?: string; actorHasStory?: boolean }> {
  try {
    let actorUsername = 'Someone';
    let actorAvatarUrl: string | undefined = undefined;
    let actorHasStory: boolean | undefined = undefined;
    if (notification.actor_id) {
      const actor = await getUser(notification.actor_id);
      if (actor && actor.username) {
        actorUsername = '@' + actor.username;
        actorAvatarUrl = actor.avatarUrl;
        actorHasStory = await checkUserHasStory(notification.actor_id);
      }
    }

    switch (notification.type) {
      case 'comment': {
        let href: string | undefined = undefined;
        let imageUrl: string | undefined = undefined;
        let isOwnPost = false;
        let isOwnStory = false;
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
        } else if (notification.story_id) {
          // For story comments, link to the user's profile where stories are shown
          isOwnStory = true; // Notifications are sent to story owner
          try {
            const sb = getClient();
            const { data: story } = await sb.from('stories').select('media_url').eq('id', notification.story_id).single();
            if (story && story.media_url) {
              imageUrl = story.media_url;
            }
            const actor = notification.actor_id ? await getUser(notification.actor_id) : null;
            if (actor && actor.username) {
              href = `/${actor.username}`;
            }
            // Stories don't have images in notifications - but now we set it
            const currentUser = await api.getCurrentUser();
          } catch (e) {
            // No href or image for story comments if can't determine
          }
        }
        const contentType = notification.post_id ? 'post' : 'story';
        const ownership = (notification.post_id && isOwnPost) || (notification.story_id && isOwnStory) ? 'your' : 'a';
        return {
          message: `${actorUsername} commented on ${ownership} ${contentType}${notification.text ? `:\n\n${notification.text.slice(0, 100)}${notification.text.length > 100 ? '...' : ''}` : ''}`,
          href,
          imageUrl,
          actorAvatarUrl,
          actorHasStory
        };
      }
      case 'thread_reply': {
        return {
          message: `${actorUsername} replied to your thread${notification.text ? `:\n\n${notification.text.slice(0, 100)}${notification.text.length > 100 ? '...' : ''}` : ''}`,
          actorAvatarUrl,
          actorHasStory
        };
      }
      case 'follow': {
        return { message: `${actorUsername} followed you`, actorAvatarUrl, actorHasStory };
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
          actorAvatarUrl,
          actorHasStory
        };
      }
      case 'like': {
        // For story likes
        return {
          message: `${actorUsername} liked your story`,
          actorAvatarUrl,
          actorHasStory
        };
      }
      case 'community_created': {
        return {
          message: `${actorUsername} created a new community`,
          actorAvatarUrl,
          actorHasStory
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
          actorAvatarUrl,
          actorHasStory
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
          actorAvatarUrl,
          actorHasStory
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
          actorAvatarUrl,
          actorHasStory
        };
      }
      default: {
        return { message: `You have a new ${notification.type} notification`, actorAvatarUrl, actorHasStory };
      }
    }
  } catch (e) {
    return { message: `You have a new ${notification.type} notification` };
  }
}