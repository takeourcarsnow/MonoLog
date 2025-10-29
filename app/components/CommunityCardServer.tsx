import React from 'react';
import CommunityCardBase from './CommunityCardBase';

type Props = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  memberCount?: number | null;
  threadCount?: number | null;
  creator?: any;
  children?: React.ReactNode;
  showCreator?: boolean;
  lastActivity?: string | null;
};

export default function CommunityCardServer({ id, name, slug, description, imageUrl, memberCount, threadCount, creator, children, showCreator = true, lastActivity }: Props) {
  return (
    <CommunityCardBase
      name={name}
      slug={slug}
      description={description}
      imageUrl={imageUrl}
      memberCount={memberCount}
      threadCount={threadCount}
      creator={creator}
      showCreator={showCreator}
      lastActivity={lastActivity}
    >
      {children}
    </CommunityCardBase>
  );
}
