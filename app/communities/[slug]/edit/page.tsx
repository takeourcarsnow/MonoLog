"use client";
import { EditCommunityView } from '@/app/components/EditCommunityView';
import { usePageScroll } from '@/src/lib/hooks/usePageScroll';

export default function EditCommunityPage() {
  usePageScroll('community-page-scroll');

  return <EditCommunityView />;
}