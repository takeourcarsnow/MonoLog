import Image from 'next/image';
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
  const isVisible = progress > 0;

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes subtleSpin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
      `}</style>
      <div
        className={`flex items-center justify-center py-4 ${className}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: -1,
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.3s ease-out',
          pointerEvents: 'none',
        }}
      >
        <div className="flex items-center space-x-2">
          <Image src="/logo.svg" alt="logo" width={20} height={20} className="w-5 h-5 pull-to-refresh-logo" style={{ animation: 'fadeIn 50ms forwards, subtleSpin 1.5s infinite' }} />
        </div>
      </div>
    </>
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
        style={{ zIndex: 2, ...getPullStyles() }}
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