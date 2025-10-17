type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  maxScale?: number;
  isActive?: boolean;
  isFullscreen?: boolean;
  instanceId?: string;
  lazy?: boolean;
  rootMargin?: string;
};

export type { Props };