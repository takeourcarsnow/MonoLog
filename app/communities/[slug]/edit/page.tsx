"use client";
import { EditCommunityView } from "@/app/components/communities/EditCommunityView";
import { usePageScroll } from '@/lib/hooks/usePageScroll';

export default function EditCommunityPage() {
  usePageScroll('community-page-scroll');

  return <EditCommunityView />;
}