"use client";
import { CommunityView } from '@/app/components/CommunityView';
import { usePageScroll } from '@/lib/hooks/usePageScroll';

export default function CommunityPage() {
  usePageScroll('community-page-scroll');

  return <CommunityView />;
}