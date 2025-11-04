"use client";
import { ThreadView } from "@/app/components/thread/ThreadView";
import { usePageScroll } from '@/lib/hooks/usePageScroll';

export default function ThreadPage() {
  usePageScroll('thread-page-scroll');

  return <ThreadView />;
}