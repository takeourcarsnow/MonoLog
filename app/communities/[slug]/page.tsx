"use client";
import { CommunityView } from "@/app/components/communities/CommunityView";
import { usePageScroll } from '@/lib/hooks/usePageScroll';
import { useEffect } from 'react';

export default function CommunityPage() {
  usePageScroll('community-page-scroll');

  // Allow body scrolling for community page
  useEffect(() => {
    document.body.classList.add('community-page');
    return () => document.body.classList.remove('community-page');
  }, []);

  return <CommunityView />;
}