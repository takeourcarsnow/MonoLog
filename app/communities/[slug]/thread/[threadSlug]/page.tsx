"use client";
import { ThreadView } from '@/app/components/ThreadView';
import { usePageScroll } from '@/lib/hooks/usePageScroll';

export default function ThreadPage() {
  usePageScroll('thread-page-scroll');

  return <ThreadView />;
}