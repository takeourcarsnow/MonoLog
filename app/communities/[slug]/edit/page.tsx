"use client";
import { EditCommunityView } from "@/app/components/communities/EditCommunityView";
import { usePageScroll } from '@/lib/hooks/usePageScroll';
import { useEffect } from 'react';

export default function EditCommunityPage() {
  usePageScroll('community-page-scroll');

  // Allow body scrolling for edit community page
  useEffect(() => {
    document.body.classList.add('edit-community-page');
    return () => document.body.classList.remove('edit-community-page');
  }, []);

  return <EditCommunityView />;
}