import useSWR from 'swr';
import { api } from '@/src/lib/api';
import type { HydratedCommunity } from '@/src/lib/types';
import { defaultSWRConfig } from './swrConfig';

export function useCommunities() {
  return useSWR<HydratedCommunity[]>('communities', () => api.getCommunities(), defaultSWRConfig);
}

export function useCommunity(slug: string) {
  return useSWR<HydratedCommunity | null>(`community-${slug}`, () => api.getCommunity(slug), defaultSWRConfig);
}