"use client";
import { ThreadView } from "@/app/components/thread/ThreadView";
import { usePageScroll } from '@/lib/hooks/usePageScroll';
import { useEffect } from 'react';

export default function ThreadPage() {
  usePageScroll('thread-page-scroll');

  // Allow body scrolling for thread page
  useEffect(() => {
    document.body.classList.add('thread-page');
    return () => document.body.classList.remove('thread-page');
  }, []);

  return <ThreadView />;
}