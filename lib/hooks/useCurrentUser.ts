import useSWR from 'swr';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';
import { defaultSWRConfig } from './swrConfig';

export function useCurrentUser() {
  return useSWR<User | null>('currentUser', () => api.getCurrentUser(), defaultSWRConfig);
}