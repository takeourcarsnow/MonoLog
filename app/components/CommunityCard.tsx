"use client";

import React from "react";
import Link from "next/link";
import type { HydratedCommunity } from "@/src/lib/types";
import { OptimizedImage } from "./OptimizedImage";
import SkeletonCard from "./SkeletonCard";
import LazyMount from "./LazyMount";
import { Button } from "./Button";
import { UserMinus, UserPlus } from "lucide-react";

type Props = {
  community: HydratedCommunity;
  meId?: string | null;
  pending?: boolean;
  onJoinLeave: (communityId: string, isMember: boolean) => void;
};

function CommunityCardInner({ community, meId, pending, onJoinLeave }: Props) {
  return (
    <Link href={`/communities/${community.slug}`} className="card mb-8 block">
      <div className="flex flex-col items-center text-center gap-3 py-4">
        <LazyMount rootMargin="150px">
          <OptimizedImage
            src={community.imageUrl || "/logo.svg"}
            alt={community.name}
            width={80}
            height={80}
            className="rounded-full cursor-pointer hover:opacity-80 transition-opacity mx-auto"
            fallbackSrc="/logo.svg"
          />
        </LazyMount>

        <h3 className="font-semibold text-lg hover:underline">{community.name}</h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-[40ch]">
          {community.description}
        </p>

        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 justify-center">
          <span>{community.memberCount || 0} members</span>
          <span>{community.threadCount || 0} threads</span>
          <span>by @{community.creator?.username}</span>
        </div>

        <div className="mt-3">
          {meId !== community.creator?.id && (
            <Button
              variant={community.isMember ? "ghost" : "default"}
              size="sm"
              className="small-min"
              onClick={() => onJoinLeave(community.id, community.isMember || false)}
              aria-label={community.isMember ? 'Leave community' : 'Join community'}
              title={community.isMember ? 'Leave community' : 'Join community'}
              disabled={!!pending}
            >
              {community.isMember ? <UserMinus size={16} /> : <UserPlus size={16} />}
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
}

export const CommunityCard = React.memo(CommunityCardInner, (prev, next) => {
  // Only re-render when relevant fields change
  return (
    prev.community.id === next.community.id &&
    prev.community.isMember === next.community.isMember &&
    (prev.community.memberCount || 0) === (next.community.memberCount || 0) &&
    (prev.community.threadCount || 0) === (next.community.threadCount || 0) &&
    !!prev.pending === !!next.pending &&
    prev.meId === next.meId
  );
});

export default CommunityCard;
