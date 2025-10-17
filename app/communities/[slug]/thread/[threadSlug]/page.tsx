"use client";
import { ThreadView } from '@/app/components/ThreadView';
import { usePageScroll } from '@/src/lib/hooks/usePageScroll';

export default function ThreadPage() {
  usePageScroll('thread-page-scroll');

  return <ThreadView />;
}