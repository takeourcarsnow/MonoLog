import useSWR from 'swr';
import { api } from '@/src/lib/api';
import type { HydratedPost } from '@/src/lib/types';

export function useFollowingFeed() {
  return useSWR<HydratedPost[]>('followingFeed', () => api.getFollowingFeed(), {
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });
}

export function useExploreFeed() {
  return useSWR<HydratedPost[]>('exploreFeed', () => api.getExploreFeed(), {
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });
}

export function useUserPosts(userId: string) {
  return useSWR<HydratedPost[]>(`userPosts-${userId}`, () => api.getUserPosts(userId), {
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });
}

export function usePost(postId: string) {
  return useSWR<HydratedPost | null>(`post-${postId}`, () => api.getPost(postId), {
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });
}