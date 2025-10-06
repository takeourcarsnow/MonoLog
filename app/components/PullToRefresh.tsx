import { ReactNode } from 'react';

interface PullToRefreshIndicatorProps {
  isRefreshing: boolean;
  pullDistance: number;
  threshold: number;
  className?: string;
}

export function PullToRefreshIndicator({
  isRefreshing,
  pullDistance,
  threshold,
  className = ''
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const opacity = Math.min(progress * 2, 1); // Fade in faster

  if (!isRefreshing && pullDistance === 0) return null;

  return (
    <div
      className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-center py-4 bg-white border-b border-gray-200 ${className}`}
      style={{
        opacity,
        transform: `translateY(${isRefreshing ? 0 : -100}%)`,
        transition: isRefreshing ? 'transform 0.2s ease-out' : 'none',
      }}
    >
      <div className="flex items-center space-x-2">
        {isRefreshing ? (
          <>
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <span className="text-sm text-gray-600">Refreshing...</span>
          </>
        ) : (
          <>
            <div
              className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center transition-colors"
              style={{
                backgroundColor: progress >= 1 ? '#3b82f6' : 'transparent',
              }}
            >
              <svg
                className={`w-3 h-3 transition-transform ${progress >= 1 ? 'rotate-180' : ''}`}
                fill="none"
                stroke={progress >= 1 ? 'white' : 'currentColor'}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </div>
            <span className="text-sm text-gray-600">
              {progress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

interface PullToRefreshWrapperProps {
  children: ReactNode;
  isRefreshing: boolean;
  pullDistance: number;
  threshold: number;
  containerRef: React.RefObject<HTMLDivElement>;
  getPullStyles: () => React.CSSProperties;
  className?: string;
}

export function PullToRefreshWrapper({
  children,
  isRefreshing,
  pullDistance,
  threshold,
  containerRef,
  getPullStyles,
  className = ''
}: PullToRefreshWrapperProps) {
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
          smooth margin transition for a nicer effect. */}
      <div
        className={isRefreshing || pullDistance > 0 ? 'pointer-events-none' : ''}
        style={{
          transition: isRefreshing ? 'margin-top 180ms ease' : 'none',
          // While actively pulling, match the visual offset to the pull distance so
          // the header/content moves with the user's gesture. When refreshing, use
          // a fixed offset equal to the indicator's approximate height.
          marginTop: isRefreshing ? 56 : pullDistance,
          willChange: 'margin-top'
        }}
      >
        {children}
      </div>
    </div>
  );
}