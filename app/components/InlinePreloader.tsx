"use client";

import { PostCardSkeleton } from "./SkeletonCard";

export default function InlinePreloader() {
  return (
    <div aria-hidden className="space-y-6">
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  );
}
