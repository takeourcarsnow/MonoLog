"use client";
import { CommunityView } from '@/app/components/CommunityView';
import { useEffect } from 'react';

export default function CommunityPage() {
  useEffect(() => {
    // Allow body scrolling on community page
    document.body.classList.add('community-page-scroll');
    document.documentElement.classList.add('community-page-scroll');

    return () => {
      // Clean up when component unmounts
      document.body.classList.remove('community-page-scroll');
      document.documentElement.classList.remove('community-page-scroll');
    };
  }, []);

  return <CommunityView />;
}