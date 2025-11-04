import Image from 'next/image';
import React, { ReactNode } from 'react';
import { SpinningLogo } from "@/app/components/ui/SpinningLogo";

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
          <SpinningLogo size={20} className="pull-to-refresh-logo" />
        </div>
      </div>
  );
});

interface PullToRefreshWrapperProps {
  children: ReactNode;
  isRefreshing: boolean;
  pullDistance: number;
  threshold: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
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