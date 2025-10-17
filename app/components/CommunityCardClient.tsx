"use client";

import React, { useCallback, useState } from 'react';
import { Button } from './Button';
import { UserMinus, UserPlus } from 'lucide-react';
import { api } from '@/src/lib/api';
import { useAuth } from '@/src/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

type Props = {
  communityId: string;
  initialIsMember?: boolean;
  initialMemberCount?: number;
  creatorId?: string;
};

export default function CommunityCardClient({ communityId, initialIsMember = false, initialMemberCount = 0, creatorId }: Props) {
  const { me } = useAuth();
  const router = useRouter();
  const [isMember, setIsMember] = useState<boolean>(initialIsMember);
  const [memberCount, setMemberCount] = useState<number>(initialMemberCount || 0);
  const [pending, setPending] = useState(false);

  const handleJoinLeave = useCallback(async () => {
    if (pending) return;

    // If user is not authenticated, redirect to auth
    if (!me) {
      router.push('/profile');
      return;
    }

    setPending(true);
    // Optimistic update
    setIsMember((prev) => {
      const next = !prev;
      setMemberCount((c) => next ? c + 1 : Math.max(0, c - 1));
      return next;
    });

    try {
      if (isMember) {
        await api.leaveCommunity(communityId);
      } else {
        await api.joinCommunity(communityId);
      }
    } catch (e: any) {
      // revert on error
      setIsMember((prev) => {
        const next = !prev;
        setMemberCount((c) => next ? c + 1 : Math.max(0, c - 1));
        return next;
      });
    } finally {
      setPending(false);
    }
  }, [communityId, isMember, pending, me, router]);

  // Hide join button for creator
  if (me?.id === creatorId) return null;

  return (
    <div>
      <Button
        variant={isMember ? 'ghost' : 'default'}
        size="sm"
        className="small-min"
        onClick={handleJoinLeave}
        disabled={pending}
        aria-label={isMember ? 'Leave community' : 'Join community'}
        title={isMember ? 'Leave community' : 'Join community'}
      >
        {isMember ? <UserMinus size={16} /> : <UserPlus size={16} />}
      </Button>
    </div>
  );
}
