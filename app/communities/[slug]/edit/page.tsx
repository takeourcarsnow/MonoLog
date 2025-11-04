"use client";
import { EditCommunityView } from '@/app/components/EditCommunityView';
import { usePageScroll } from '@/lib/hooks/usePageScroll';

export default function EditCommunityPage() {
  usePageScroll('community-page-scroll');

  return <EditCommunityView />;
}