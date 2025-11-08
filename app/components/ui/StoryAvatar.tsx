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

const STORY_INDICATOR_STYLE = {
  outline: '3px solid #ff7e39',
  outlineOffset: 2
};

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

  const imageStyle = {
    ...baseImageStyle,
    ...(hasStory ? STORY_INDICATOR_STYLE : {})
  };

  const imageElement = (
    <div style={{ width: size, height: size, position: 'relative' }}>
      {priority ? (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          style={imageStyle}
          priority
        />
      ) : (
        <OptimizedImage
          src={src}
          alt={alt}
          width={size}
          height={size}
          className={className}
          style={{
            ...baseImageStyle,
            ...(hasStory ? STORY_INDICATOR_STYLE : {})
          }}
          loading="lazy"
          sizes={`${size}px`}
        />
      )}
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