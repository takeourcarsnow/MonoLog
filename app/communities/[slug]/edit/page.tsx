"use client";
import { EditCommunityView } from '@/app/components/EditCommunityView';
import { useEffect } from 'react';

export default function EditCommunityPage() {
  useEffect(() => {
    // Allow body scrolling on edit community page
    document.body.classList.add('community-page-scroll');
    document.documentElement.classList.add('community-page-scroll');

    return () => {
      // Clean up when component unmounts
      document.body.classList.remove('community-page-scroll');
      document.documentElement.classList.remove('community-page-scroll');
    };
  }, []);

  return <EditCommunityView />;
}