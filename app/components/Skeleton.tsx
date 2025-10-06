"use client";

import { ReactNode } from "react";

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  className?: string;
  style?: React.CSSProperties;
  count?: number;
  children?: ReactNode;
}

export function Skeleton({
  width,
  height,
  borderRadius,
  className = "",
  style = {},
  count = 1,
  children
}: SkeletonProps) {
  const baseStyle: React.CSSProperties = {
    width,
    height,
    borderRadius,
    ...style
  };

  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className={`skeleton ${className}`}
            style={baseStyle}
          />
        ))}
      </>
    );
  }

  if (children) {
    return (
      <div className={`skeleton ${className}`} style={baseStyle}>
        {children}
      </div>
    );
  }

  return <div className={`skeleton ${className}`} style={baseStyle} />;
}

// Common skeleton patterns
export function SkeletonCard({ height = 240, maxWidth = 800, margin = "24px auto" }: { height?: number; maxWidth?: number; margin?: string }) {
  return <Skeleton className="card" style={{ height, maxWidth, margin }} />;
}

export function SkeletonTile({ height = 160, count = 1 }: { height?: number; count?: number }) {
  return <Skeleton className="tile" style={{ height }} count={count} />;
}

export function SkeletonAvatar({ size = 96 }: { size?: number }) {
  return <Skeleton style={{ width: size, height: size, borderRadius: '50%' }} />;
}

export function SkeletonText({ width, height = 20, borderRadius = 8 }: { width?: number | string; height?: number; borderRadius?: number }) {
  return <Skeleton style={{ width, height, borderRadius }} />;
}