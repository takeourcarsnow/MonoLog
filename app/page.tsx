"use client";
import { FeedView } from "@/app/components/FeedView";
import { ExploreView } from "@/app/components/ExploreView";
import { useAuth } from "@/src/lib/hooks/useAuth";

export default function Page() {
  const { me, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>; // Or a proper loading component
  }

  return me ? <FeedView /> : <ExploreView />;
}
