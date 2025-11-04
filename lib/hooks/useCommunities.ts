import useSWR from 'swr';
import { api } from '@/lib/api';
import type { HydratedCommunity } from '@/lib/types';
import { defaultSWRConfig } from './swrConfig';

export function useCommunities() {
  return useSWR<HydratedCommunity[]>('communities', () => api.getCommunities(), defaultSWRConfig);
}

export function useCommunity(slug: string) {
  return useSWR<HydratedCommunity | null>(`community-${slug}`, () => api.getCommunity(slug), defaultSWRConfig);
}