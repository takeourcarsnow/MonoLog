"use client";
import { CreateCommunityView } from '@/app/components/CreateCommunityView';
import { useEffect } from 'react';

export const dynamic = 'force-dynamic';

export default function CreateCommunityPage() {
  useEffect(() => {
    // Allow body scrolling on create community page
    document.body.classList.add('communities-page-scroll');
    document.documentElement.classList.add('communities-page-scroll');

    return () => {
      // Clean up when component unmounts
      document.body.classList.remove('communities-page-scroll');
      document.documentElement.classList.remove('communities-page-scroll');
    };
  }, []);

  return <CreateCommunityView />;
}