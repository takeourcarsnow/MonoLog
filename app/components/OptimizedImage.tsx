import Image from "next/image";
import { memo, useState } from "react";

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
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentSrc, setCurrentSrc] = useState(src);

  // Debugging: log initial src for browser console to help trace avatar issues
  try {
    console.debug('[OptimizedImage] init src:', { src, currentSrc, fallbackSrc });
  } catch (e) {}

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
      className={className}
      style={{
        ...style,
        width: fill ? undefined : width,
        height: fill ? undefined : height,
        transition: 'opacity 0.3s ease-in-out',
        opacity: isLoading ? 0.7 : 1,
      }}
      unoptimized={unoptimized}
      priority={priority}
      sizes={sizes}
      loading={loading ?? (priority ? 'eager' : 'lazy')}
      placeholder={shouldUsePlaceholder ? placeholder : 'empty'}
      blurDataURL={defaultBlurDataURL}
      onLoad={() => {
        setIsLoading(false);
        onLoad?.();
      }}
      onError={handleError}
    />
  );
});
