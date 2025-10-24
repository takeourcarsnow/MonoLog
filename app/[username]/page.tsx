"use client";
import { useEffect, useState } from "react";
import { ProfileView } from "@/app/components/ProfileView";
import { supabaseApi } from "@/src/lib/api/supabase";
import { notFound } from "next/navigation";
import { SkeletonCard, SkeletonTile } from "@/app/components/Skeleton";
import { RESERVED_ROUTES } from "@/src/lib/types";

export const dynamic = 'force-dynamic';

function looksLikeUuid(s: string) {
  // loose check: UUIDs usually contain hyphens and are long
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(s);
}

export default function UsernamePage({ params }: { params: { username: string } }) {
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    async function resolve() {
      const username = params.username;
  // params resolved
      
      // Check if this is a reserved route name
      if (RESERVED_ROUTES.includes(username.toLowerCase())) {
        if (!mounted) return;
        notFound();
        return;
      }

      try {
        // If it looks like a UUID, try to use it directly
        if (looksLikeUuid(username)) {
          if (!mounted) return;
          setResolvedId(username);
          setLoading(false);
          return;
        }

        // Try to resolve username to user id

  const user = await supabaseApi.getUserByUsername?.(username);
        if (!mounted) return;

        if (user && user.id) {
          setResolvedId(user.id);
        } else {
          notFound();
          return;
        }
      } catch (e) {
        console.error('Error resolving username:', e);
        if (!mounted) return;
        notFound();
        return;
      }
      
      setLoading(false);
    }

    resolve();
    return () => { mounted = false; };
  }, [params.username]);

  if (loading) {
    return (
      <div className="view-fade">
        <SkeletonCard height={120} maxWidth={800} margin="24px auto" />
        <div className="grid" aria-label="Loading posts">
          <SkeletonTile height={160} count={3} />
        </div>
      </div>
    );
  }
  if (!resolvedId) return null; // notFound() will handle this

  return <ProfileView userId={resolvedId} />;
}
