import useSWR from 'swr';
import { api } from '@/src/lib/api';
import type { HydratedCommunity } from '@/src/lib/types';

export function useCommunities() {
  return useSWR<HydratedCommunity[]>('communities', () => api.getCommunities(), {
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });
}

export function useCommunity(slug: string) {
  return useSWR<HydratedCommunity | null>(`community-${slug}`, () => api.getCommunity(slug), {
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });
}