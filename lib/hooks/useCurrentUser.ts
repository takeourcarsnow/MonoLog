import useSWR from 'swr';
import { api } from '@/src/lib/api';
import type { User } from '@/src/lib/types';
import { defaultSWRConfig } from './swrConfig';

export function useCurrentUser() {
  return useSWR<User | null>('currentUser', () => api.getCurrentUser(), defaultSWRConfig);
}