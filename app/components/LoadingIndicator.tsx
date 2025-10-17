import Image from 'next/image';
import { useState, useEffect } from 'react';

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
}

export function InfiniteScrollLoader({
  loading,
  hasMore,
  error,
  onRetry,
  className = '',
  setSentinel
}: InfiniteScrollLoaderProps) {
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center py-8 px-4 ${className}`}>
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
        <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
          <div className="flex items-center space-x-2">
            <Image src="/logo.svg" alt="logo" width={20} height={20} className="w-5 h-5 pull-to-refresh-logo" style={{ animation: 'fadeIn 50ms forwards, subtleSpin 1.5s infinite' }} />
          </div>
          <div className="text-gray-500 text-sm mt-2">Loading more posts...</div>
        </div>
      </>
    );
  }

  if (!hasMore) {
    return (
      <div className={`text-center py-8 text-gray-500 text-sm ${className}`}>
        You&apos;ve reached the end!
      </div>
    );
  }

  // When there are more posts available, render the sentinel for infinite scroll
  if (setSentinel) {
    return <div ref={setSentinel} className={`feed-sentinel ${className}`} />;
  }

  return null;
}