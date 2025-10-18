type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  maxScale?: number;
  isActive?: boolean;
  isFullscreen?: boolean;
  instanceId?: string;
  lazy?: boolean;
  rootMargin?: string;
  onDimensionsChange?: (dimensions: { width: number; height: number }) => void;
};

export type { Props };