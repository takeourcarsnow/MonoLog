import React from "react";

type Props = {
  height?: number | string;
};

export default function SkeletonCard({ height = 120 }: Props) {
  return (
    <div className="card animate-pulse" style={{ height }}>
      <div className="flex flex-col items-center text-center gap-3 py-4">
        <div className="rounded-full bg-gray-200 dark:bg-gray-700" style={{ width: 80, height: 80 }} />
        <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
        <div className="h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded mt-3" />
      </div>
    </div>
  );
}

export function CommunityHeaderSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex flex-col items-center text-center gap-4 py-4">
        {/* Community image */}
        <div className="rounded-full bg-gray-200 dark:bg-gray-700 mx-auto" style={{ width: 80, height: 80 }} />
        
        {/* Title */}
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mx-auto" />
        
        {/* Description */}
        <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mt-1 mx-auto" />
        
        {/* Stats */}
        <div className="flex items-center gap-4 mt-2 justify-center">
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        
        {/* Buttons */}
        <div className="flex gap-2 justify-center mt-3">
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    </div>
  );
}

export function ThreadCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-start gap-3 p-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="rounded-full bg-gray-200 dark:bg-gray-700" style={{ width: 40, height: 40 }} />
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          
          {/* Content preview */}
          <div className="space-y-1 mb-2">
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          
          {/* Metadata */}
          <div className="flex items-center gap-4 text-sm">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-14 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <article className="post-card animate-pulse">
      {/* User Header */}
      <div className="post-header">
        <div className="flex items-center gap-3">
          <div className="avatar rounded-full bg-gray-200 dark:bg-gray-700" style={{ width: 32, height: 32 }} />
          <div className="flex-1">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mt-1" />
          </div>
        </div>
      </div>
      
      {/* Media Section */}
      <div className="post-media">
        <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      
      {/* Post Body */}
      <div className="post-body">
        {/* Caption */}
        <div className="space-y-1 mb-3">
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    </article>
  );
}
