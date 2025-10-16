"use client";
import { CreateThreadView } from '@/app/components/CreateThreadView';
import { useEffect } from 'react';

export default function CreateThreadPage() {
  useEffect(() => {
    // Allow body scrolling on create thread page
    document.body.classList.add('create-thread-page-scroll');
    document.documentElement.classList.add('create-thread-page-scroll');

    return () => {
      // Clean up when component unmounts
      document.body.classList.remove('create-thread-page-scroll');
      document.documentElement.classList.remove('create-thread-page-scroll');
    };
  }, []);

  return <CreateThreadView />;
}