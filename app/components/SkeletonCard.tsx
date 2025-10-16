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
