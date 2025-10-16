import React from 'react';
import Link from 'next/link';
import { OptimizedImage } from './OptimizedImage';

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
};

export default function CommunityCardServer({ id, name, slug, description, imageUrl, memberCount, threadCount, creator, children }: Props) {
  return (
    <div className="card mb-8">
      <div className="flex flex-col items-center text-center gap-3 py-4">
        <OptimizedImage
          src={(imageUrl || '/logo.svg') as string}
          alt={name}
          width={80}
          height={80}
          className="rounded-full mx-auto"
          fallbackSrc="/logo.svg"
          sizes="80px"
        />

        <Link href={`/communities/${slug}`} prefetch={true}>
          <h3 className="font-semibold text-lg hover:underline">{name}</h3>
        </Link>

        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-[40ch]">
          {description}
        </p>

        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 justify-center">
          <span>{memberCount || 0} members</span>
          <span>{threadCount || 0} threads</span>
          <span>by @{creator?.username}</span>
        </div>

        {/* Render any client-side children (eg. join/leave button) inside the card */}
        {children}
      </div>
    </div>
  );
}
