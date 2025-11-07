"use client";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

export function Skeleton({
  className,
  width,
  height,
  borderRadius = "4px"
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse ${className || ''}`}
      style={{
        width,
        height,
        borderRadius,
        background: "var(--muted)",
        opacity: 0.3,
      }}
    />
  );
}