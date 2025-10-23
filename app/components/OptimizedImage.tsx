"use client";

import Image from "next/image";
import { memo, useState, useEffect } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
  unoptimized?: boolean;
  priority?: boolean;
  sizes?: string;
  loading?: 'eager' | 'lazy';
  onLoad?: () => void;
  onError?: () => void;
  blurDataURL?: string;
  placeholder?: 'blur' | 'empty';
  fallbackSrc?: string;
  disableLoadingTransition?: boolean;
}

export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  style,
  unoptimized = false,
  priority = false,
  sizes,
  loading,
  onLoad,
  onError,
  blurDataURL,
  placeholder = 'blur',
  fallbackSrc,
  disableLoadingTransition = false,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(disableLoadingTransition ? false : true);
  // Normalize incoming src to avoid invalid characters (for example
  // backslashes in paths which can end up encoded as "%5C" and cause
  // the Next image optimizer to reject the request with
  // INVALID_IMAGE_OPTIMIZE_REQUEST). Keep data: and relative URLs intact.
  const normalizeSrc = (s?: string) => {
    if (!s) return s as any;
    try {
      // Don't touch data URLs or same-origin root-relative paths
      if (s.startsWith('data:') || s.startsWith('/')) return s;
      // Try to decode then replace backslashes with forward slashes
      let dec = decodeURIComponent(s);
      if (dec.indexOf('\\') !== -1) dec = dec.replace(/\\/g, '/');
      // Return decoded (with forward slashes). next/image will re-encode as needed.
      return dec;
    } catch (e) {
      // If decode fails, fall back to a simple replacement
      return s.replace(/\\/g, '/');
    }
  };

  const [currentSrc, setCurrentSrc] = useState(() => normalizeSrc(src));

  // Keep currentSrc in sync with prop changes and normalize new values
  useEffect(() => {
    setCurrentSrc(normalizeSrc(src));
  }, [src]);

  // For small images (<=40px), don't use placeholder for performance
  const shouldUsePlaceholder = placeholder !== 'empty' && (!width || !height || (width > 40 && height > 40));

  // Generate a simple blur placeholder if none provided and blur is requested
  const defaultBlurDataURL = blurDataURL || (shouldUsePlaceholder && placeholder === 'blur' ?
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+IRjWjBqO6O2mhP//Z" :
    undefined);

  const handleError = () => {
    // If an error occurs, switch to fallback and log the event so it can be inspected
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      try { console.debug('[OptimizedImage] image failed to load, switching to fallback:', { currentSrc, fallbackSrc }); } catch (e) {}
      setCurrentSrc(fallbackSrc);
    } else {
      try { console.debug('[OptimizedImage] image failed to load, no fallback available:', { currentSrc }); } catch (e) {}
      onError?.();
    }
  };

  return (
    <Image
      src={currentSrc}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      fill={fill}
      className={`${className || ''} ${currentSrc === '/logo.svg' ? 'default-avatar' : ''}`.trim()}
      style={{
        ...style,
        width: fill ? undefined : width,
        height: fill ? undefined : height,
        ...(disableLoadingTransition ? {} : {
          transition: 'opacity 0.3s ease-in-out',
          opacity: isLoading ? 0.7 : 1,
        }),
      }}
      unoptimized={unoptimized}
      priority={priority}
      sizes={sizes}
      loading={loading ?? (priority ? 'eager' : 'lazy')}
      placeholder={shouldUsePlaceholder ? placeholder : 'empty'}
      blurDataURL={defaultBlurDataURL}
      onLoad={() => {
        if (!disableLoadingTransition) {
          setIsLoading(false);
        }
        onLoad?.();
      }}
      onError={handleError}
    />
  );
});
