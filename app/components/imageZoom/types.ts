type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string;
  fallbackSrc?: string;
  maxScale?: number;
  isActive?: boolean;
  isFullscreen?: boolean;
  instanceId?: string;
  lazy?: boolean;
  rootMargin?: string;
  onDimensionsChange?: (dimensions: { width: number; height: number }) => void;
};

export type { Props };