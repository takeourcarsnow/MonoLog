import useSWR from 'swr';
import { api } from '@/lib/api';
import type { HydratedPost } from '@/lib/types';
import { defaultSWRConfig, longDedupingConfig } from './swrConfig';

export function useFollowingFeed() {
  return useSWR<HydratedPost[]>('followingFeed', () => api.getFollowingFeed(), defaultSWRConfig);
}

export function useExploreFeed() {
  return useSWR<HydratedPost[]>('exploreFeed', () => api.getExploreFeed(), defaultSWRConfig);
}

export function useUserPosts(userId: string) {
  return useSWR<HydratedPost[]>(`userPosts-${userId}`, () => api.getUserPosts(userId), defaultSWRConfig);
}

export function usePost(postId: string) {
  return useSWR<HydratedPost | null>(`post-${postId}`, () => api.getPost(postId), longDedupingConfig);
}