import Image from 'next/image';
import { useState, useEffect } from 'react';
import { SpinningLogo } from "@/app/components/ui/SpinningLogo";

interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  type?: 'spinner' | 'dots' | 'pulse';
  className?: string;
}

export function LoadingIndicator({
  size = 'medium',
  type = 'spinner',
  className = ''
}: LoadingIndicatorProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (type !== 'dots') return;

    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, [type]);

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };

  if (type === 'spinner') {
    return (
      <div className={`inline-block ${sizeClasses[size]} ${className}`}>
        <div className="w-full h-full border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (type === 'dots') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <span className="text-gray-500">Loading{dots}</span>
      </div>
    );
  }

  if (type === 'pulse') {
    return (
      <div className={`inline-block ${sizeClasses[size]} ${className}`}>
        <div className="w-full h-full bg-gray-300 rounded-full animate-pulse"></div>
      </div>
    );
  }

  return null;
}

interface InfiniteScrollLoaderProps {
  loading: boolean;
  hasMore: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
  setSentinel?: (el: HTMLDivElement | null) => void;
  active?: boolean;
  showEndMessage?: boolean;
}

export function InfiniteScrollLoader({
  loading,
  hasMore,
  error,
  onRetry,
  className = '',
  setSentinel,
  active = true,
  showEndMessage = true
}: InfiniteScrollLoaderProps) {
  const loaderMinHeight = { minHeight: '84px' };

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center px-4 ${className}`} style={loaderMinHeight}>
        <div className="text-red-500 text-sm mb-2">Failed to load more posts</div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
        <div className={`flex flex-col items-center justify-center ${className}`} style={loaderMinHeight}>
          <div className="flex items-center space-x-2">
            <SpinningLogo size={20} />
          </div>
        </div>
    );
  }

  if (!hasMore) {
    if (!showEndMessage) return null;
    return (
      <div className={`text-center text-gray-500 text-sm ${className}`} style={loaderMinHeight}>
        <div className="flex items-center justify-center h-full">
          You&apos;ve reached the end!
        </div>
      </div>
    );
  }

  // When there are more posts available, render the sentinel with reserved height
  if (setSentinel && active) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`} style={loaderMinHeight}>
        <div ref={setSentinel} className="feed-sentinel" style={{ height: '20px' }} />
      </div>
    );
  }

  return null;
}