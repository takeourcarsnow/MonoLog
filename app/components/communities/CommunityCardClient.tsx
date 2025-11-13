"use client";

import React, { useCallback, useState } from 'react';
import ToggleActionButton from "@/app/components/ui/ToggleActionButton";
import { UserMinus, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

type Props = {
  communityId: string;
  initialIsMember?: boolean;
  initialMemberCount?: number;
  creatorId?: string;
  /** When true the inline join/leave button is hidden (used on communities list) */
  hideInlineJoin?: boolean;
};

export default function CommunityCardClient({ communityId, initialIsMember = false, initialMemberCount = 0, creatorId, hideInlineJoin = false }: Props) {
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

  // Hide join button for creator or when explicitly hidden by parent
  if (me?.id === creatorId || hideInlineJoin) return null;

  return (
    <div>
      <ToggleActionButton
        active={isMember}
        pending={pending}
        onClick={handleJoinLeave}
        className="small-min no-effects"
        activeIcon={<UserMinus size={16} />}
        inactiveIcon={<UserPlus size={16} />}
        ariaActiveLabel="Leave community"
        ariaInactiveLabel="Join community"
        titleActive="Leave community"
        titleInactive="Join community"
        useSpinningLogo={true}
      />
    </div>
  );
}
