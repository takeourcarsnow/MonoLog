import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { HydratedCommunity } from '@/lib/types';

export function useCommunity(communitySlug: string | null) {
  const [community, setCommunity] = useState<HydratedCommunity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!communitySlug) return;
    setLoading(true);
    setError(null);
    api.getCommunity(communitySlug)
      .then(setCommunity)
      .catch((e) => setError(e.message || 'Community not found'))
      .finally(() => setLoading(false));
  }, [communitySlug]);

  return { community, loading, error };
}