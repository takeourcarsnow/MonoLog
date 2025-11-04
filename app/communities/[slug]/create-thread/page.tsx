"use client";
import { CreateThreadView } from '@/app/components/CreateThreadView';
import { usePageScroll } from '@/lib/hooks/usePageScroll';

export default function CreateThreadPage() {
  usePageScroll('create-thread-page-scroll');

  return <CreateThreadView />;
}