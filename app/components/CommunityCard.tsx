"use client";

import React from "react";
import type { HydratedCommunity } from "@/lib/types";
import CommunityCardBase from "./CommunityCardBase";
import LazyMount from "./LazyMount";
import ToggleActionButton from "./ToggleActionButton";
import { UserMinus, UserPlus } from "lucide-react";

type Props = {
  community: HydratedCommunity;
  meId?: string | null;
  pending?: boolean;
  onJoinLeave: (communityId: string, isMember: boolean) => void;
  showCreator?: boolean;
};

function CommunityCardInner({ community, meId, pending, onJoinLeave, showCreator = true }: Props) {
  const imageNode = (
    <LazyMount rootMargin="150px">
      <img
        src={community.imageUrl || "/logo.svg"}
        alt={community.name}
        width={80}
        height={80}
        className="rounded-full cursor-pointer hover:opacity-80 transition-opacity mx-auto"
      />
    </LazyMount>
  );

  return (
    <CommunityCardBase
      name={community.name}
      slug={community.slug}
      description={community.description}
      imageNode={imageNode}
      memberCount={community.memberCount}
      threadCount={community.threadCount}
      creator={community.creator}
      showCreator={showCreator}
    >
      <div className="mt-3">
        {meId !== community.creator?.id && (
          <ToggleActionButton
            active={!!community.isMember}
            pending={!!pending}
            onClick={() => onJoinLeave(community.id, community.isMember || false)}
            className="small-min"
            activeIcon={<UserMinus size={16} />}
            inactiveIcon={<UserPlus size={16} />}
            ariaActiveLabel="Leave community"
            ariaInactiveLabel="Join community"
            titleActive="Leave community"
            titleInactive="Join community"
          />
        )}
      </div>
    </CommunityCardBase>
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
    prev.meId === next.meId &&
    prev.showCreator === next.showCreator
  );
});

export default CommunityCard;
