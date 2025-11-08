"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { OptimizedImage } from "@/app/components/media/OptimizedImage";

interface StoryAvatarProps {
  src: string;
  alt: string;
  username?: string;
  hasStory?: boolean;
  size?: number;
  className?: string;
  onClick?: () => void;
  href?: string;
  showCount?: number;
  priority?: boolean;
}

const STORY_GRADIENT = 'linear-gradient(45deg, #ff0096, #00ccff, #ff7e39, #ffff00, #ff0096)';

export const StoryAvatar = memo(function StoryAvatar({
  src,
  alt,
  username,
  hasStory = false,
  size = 56,
  className = "",
  onClick,
  href,
  showCount,
  priority = false
}: StoryAvatarProps) {
  const baseImageStyle = {
    borderRadius: '50%',
    objectFit: 'cover' as const,
    width: '100%',
    height: '100%'
  };

  const containerStyle = {
    width: size,
    height: size,
    position: 'relative' as const
  };

  const wrapperStyle = hasStory ? {
    borderRadius: '50%',
    padding: 2,
    background: STORY_GRADIENT,
    backgroundSize: '400% 400%',
    animation: 'story-progress-rainbow 3s linear infinite',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  } : {};

  const innerStyle = {
    borderRadius: '50%',
    overflow: 'hidden',
    width: hasStory ? 'calc(100% - 4px)' : '100%',
    height: hasStory ? 'calc(100% - 4px)' : '100%'
  };

  const imageElement = (
    <div style={containerStyle}>
      <div style={wrapperStyle}>
        <div style={innerStyle}>
          {priority ? (
            <Image
              src={src}
              alt={alt}
              width={size}
              height={size}
              style={baseImageStyle}
              priority
            />
          ) : (
            <OptimizedImage
              src={src}
              alt={alt}
              width={size}
              height={size}
              className={className}
              style={baseImageStyle}
              loading="lazy"
              sizes={`${size}px`}
            />
          )}
        </div>
      </div>
      {showCount && showCount > 1 && (
        <span style={{
          position: 'absolute',
          bottom: -4,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 10,
          background: '#111',
          color: '#fff',
          padding: '2px 6px',
          borderRadius: 10
        }}>
          {showCount}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick}>
        {imageElement}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        aria-label={alt}
      >
        {imageElement}
      </button>
    );
  }

  return imageElement;
});