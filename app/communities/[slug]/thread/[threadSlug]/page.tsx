"use client";
import { ThreadView } from '@/app/components/ThreadView';
import { useEffect } from 'react';

export default function ThreadPage() {
  useEffect(() => {
    // Allow body scrolling on thread page
    document.body.classList.add('thread-page-scroll');
    document.documentElement.classList.add('thread-page-scroll');

    return () => {
      // Clean up when component unmounts
      document.body.classList.remove('thread-page-scroll');
      document.documentElement.classList.remove('thread-page-scroll');
    };
  }, []);

  return <ThreadView />;
}