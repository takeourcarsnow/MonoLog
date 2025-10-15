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
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  // For small images (<=40px), don't use placeholder for performance
  const shouldUsePlaceholder = placeholder !== 'empty' && (!width || !height || (width > 40 && height > 40));

  // Generate a simple blur placeholder if none provided and blur is requested
  const defaultBlurDataURL = blurDataURL || (shouldUsePlaceholder && placeholder === 'blur' ?
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+IRjWjBqO6O2mhP//Z" :
    undefined);

  return (
    <Image
      src={src}
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
      loading={loading}
      placeholder={shouldUsePlaceholder ? placeholder : 'empty'}
      blurDataURL={defaultBlurDataURL}
      onLoad={() => {
        setIsLoading(false);
        onLoad?.();
      }}
      onError={onError}
    />
  );
});
