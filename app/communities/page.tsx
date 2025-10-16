"use client";
import { CommunitiesView } from '@/app/components/CommunitiesView';
import { useEffect } from 'react';

export default function CommunitiesPage() {
  useEffect(() => {
    // Allow body scrolling on communities page
    document.body.classList.add('communities-page-scroll');
    document.documentElement.classList.add('communities-page-scroll');

    return () => {
      // Clean up when component unmounts
      document.body.classList.remove('communities-page-scroll');
      document.documentElement.classList.remove('communities-page-scroll');
    };
  }, []);

  return <CommunitiesView />;
}