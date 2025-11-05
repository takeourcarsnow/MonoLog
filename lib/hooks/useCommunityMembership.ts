import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import type { HydratedCommunity } from '@/lib/types';

export function useCommunityMembership() {
  const [pending, setPending] = useState<Set<string>>(new Set());

  const joinLeave = useCallback(async (
    communityId: string,
    isMember: boolean,
    mutate: any,
    onError: (error: any) => void
  ) => {
    if (pending.has(communityId)) return;
    setPending((s) => new Set(s).add(communityId));

    // Helper to update member count
    const updateMemberCount = (currentCount: number, joining: boolean) => {
      return joining ? currentCount + 1 : Math.max(0, currentCount - 1);
    };

    // Optimistic update
    mutate(
      (prev: any) => prev?.map((c: any) => {
        if (c.id !== communityId) return c;
        return {
          ...c,
          isMember: !isMember,
          memberCount: updateMemberCount(c.memberCount || 0, !isMember)
        };
      }),
      false // don't revalidate
    );

    try {
      if (isMember) {
        await api.leaveCommunity(communityId);
      } else {
        await api.joinCommunity(communityId);
      }
      // Success: revalidate
      mutate();
    } catch (e: any) {
      // Revert optimistic update
      mutate(
        (prev: any) => prev?.map((c: any) => {
          if (c.id !== communityId) return c;
          return { ...c, isMember, memberCount: updateMemberCount(c.memberCount || 0, isMember) };
        }),
        false
      );
      onError(e);
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(communityId);
        return next;
      });
    }
  }, [pending]);

  return { joinLeave, pending };
}