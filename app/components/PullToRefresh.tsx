import React, { ReactNode } from 'react';

interface PullToRefreshIndicatorProps {
  isRefreshing: boolean;
  pullDistance: number;
  threshold: number;
  className?: string;
}

export const PullToRefreshIndicator = React.memo<PullToRefreshIndicatorProps>(({
  isRefreshing,
  pullDistance,
  threshold,
  className = ''
}) => {
  const isVisible = isRefreshing || pullDistance >= threshold;

  return (
    <div
      className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-center py-4 ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: `translateY(${isVisible ? 0 : -100}%)`,
        transition: 'transform 0.2s ease-out, opacity 0.2s ease-out',
      }}
    >
      <div className="flex items-center space-x-2">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    </div>
  );
});

interface PullToRefreshWrapperProps {
  children: ReactNode;
  isRefreshing: boolean;
  pullDistance: number;
  threshold: number;
  containerRef: React.RefObject<HTMLDivElement>;
  getPullStyles: () => React.CSSProperties;
  className?: string;
}

export const PullToRefreshWrapper = React.memo<PullToRefreshWrapperProps>(({
  children,
  isRefreshing,
  pullDistance,
  threshold,
  containerRef,
  getPullStyles,
  className = ''
}) => {
  const effectivePull = React.useMemo(() => threshold * (1 - Math.exp(-pullDistance / threshold)), [pullDistance, threshold]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={getPullStyles()}
    >
      <PullToRefreshIndicator
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
        threshold={threshold}
      />
      {/* When pulling or refreshing, push the content down so the header
          / avatar / follow button isn't obscured by the indicator. Use a
          smooth transform transition for better performance. */}
      <div
        className={isRefreshing || pullDistance > 0 ? 'pointer-events-none' : ''}
        style={{
          transition: 'transform 180ms ease',
          // While actively pulling, match the visual offset to the pull distance so
          // the header/content moves with the user's gesture. When refreshing, use
          // a fixed offset equal to the indicator's approximate height.
          transform: `translateY(${isRefreshing ? 56 : effectivePull}px)`,
          willChange: 'transform'
        }}
      >
        {children}
      </div>
    </div>
  );
});

// Set a displayName so ESLint/react-display-name is satisfied when using React.memo
PullToRefreshIndicator.displayName = 'PullToRefreshIndicator';

// Set a displayName so ESLint/react-display-name is satisfied when using React.memo
PullToRefreshWrapper.displayName = 'PullToRefreshWrapper';