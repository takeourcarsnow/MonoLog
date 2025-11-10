"use client";
import { CreateThreadView } from '@/app/components/CreateThreadView';
import { usePageScroll } from '@/lib/hooks/usePageScroll';
import { useEffect } from 'react';

export default function CreateThreadPage() {
  usePageScroll('create-thread-page-scroll');

  // Allow body scrolling for create thread page
  useEffect(() => {
    document.body.classList.add('create-thread-page');
    return () => document.body.classList.remove('create-thread-page');
  }, []);

  return <CreateThreadView />;
}