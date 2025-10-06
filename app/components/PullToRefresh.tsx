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
  const progress = Math.min(pullDistance / threshold, 1);
  const isVisible = isRefreshing || progress > 0;

  return (
    <div
      className={`flex items-center justify-center py-4 bg-white border-b border-gray-200 ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        height: isVisible ? 'auto' : 0,
        overflow: 'hidden',
        transition: isRefreshing ? 'opacity 0.3s ease-out, height 0.3s ease-out' : 'none',
      }}
    >
      <div className="flex items-center space-x-2">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        {isRefreshing && <span className="text-sm text-gray-600">Refreshing...</span>}
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
  return (
    <div className={`relative ${className}`}>
      <PullToRefreshIndicator
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
        threshold={threshold}
      />
      <div
        ref={containerRef}
        style={getPullStyles()}
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