"use client";
import { CreateCommunityView } from "@/app/components/communities/CreateCommunityView";
import { useEffect } from 'react';

export const dynamic = 'force-dynamic';

export default function CreateCommunityPage() {
  // Allow body scrolling for create community page
  useEffect(() => {
    document.body.classList.add('create-community-page');
    return () => document.body.classList.remove('create-community-page');
  }, []);

  return <CreateCommunityView />;
}