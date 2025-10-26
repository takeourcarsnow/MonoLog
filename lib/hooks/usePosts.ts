import useSWR from 'swr';
import { api } from '@/src/lib/api';
import type { HydratedPost } from '@/src/lib/types';

export function useFollowingFeed() {
  return useSWR<HydratedPost[]>('followingFeed', () => api.getFollowingFeed(), {
    revalidateOnMount: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000, // Dedupe requests within 5 seconds
    focusThrottleInterval: 10000, // Throttle focus revalidation
    errorRetryInterval: 5000, // Retry failed requests after 5 seconds
  });
}

export function useExploreFeed() {
  return useSWR<HydratedPost[]>('exploreFeed', () => api.getExploreFeed(), {
    revalidateOnMount: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
    focusThrottleInterval: 10000,
    errorRetryInterval: 5000,
  });
}

export function useUserPosts(userId: string) {
  return useSWR<HydratedPost[]>(`userPosts-${userId}`, () => api.getUserPosts(userId), {
    revalidateOnMount: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 10000, // Longer deduping for user posts
    focusThrottleInterval: 15000,
    errorRetryInterval: 5000,
  });
}

export function usePost(postId: string) {
  return useSWR<HydratedPost | null>(`post-${postId}`, () => api.getPost(postId), {
    revalidateOnMount: true,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 30000, // Very long deduping for individual posts
    focusThrottleInterval: 30000,
    errorRetryInterval: 10000,
  });
}