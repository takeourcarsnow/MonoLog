"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProfileView } from "@/app/components/profile/ProfileView";
import { supabaseApi } from "@/lib/api/supabase";
import { notFound } from "next/navigation";
import { ProfileSkeleton } from "@/app/components/profile/ProfileSkeleton";
import { RESERVED_ROUTES } from "@/lib/types";

export const dynamic = 'force-dynamic';

function looksLikeUuid(s: string) {
  // loose check: UUIDs usually contain hyphens and are long
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(s);
}

export default function UsernamePage() {
  const params = useParams();
  const username = params.username as string;
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    async function resolve() {
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
  }, [username]);

  if (loading) {
    return <ProfileSkeleton />;
  }
  if (!resolvedId) return null; // notFound() will handle this

  return <ProfileView userId={resolvedId} />;
}
