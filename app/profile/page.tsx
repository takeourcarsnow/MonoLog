"use client";
import { useEffect, useState } from "react";
import { ProfileView } from "@/app/components/profile/ProfileView";
import { supabaseApi } from "@/lib/api/supabase";
import { notFound } from "next/navigation";
import { ProfileSkeleton } from "@/app/components/profile/ProfileSkeleton";

export const dynamic = 'force-dynamic';

function looksLikeUuid(s: string) {
  // loose check: UUIDs usually contain hyphens and are long
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(s);
}

export default function ProfilePage() {
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    async function resolve() {
      const username = 'profile';
      
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
          setResolvedId(null);
        }
      } catch (e) {
        console.error('Error resolving username:', e);
        if (!mounted) return;
        setResolvedId(null);
      }
      
      setLoading(false);
    }

    resolve();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <ProfileSkeleton />;
  }

  return <ProfileView userId={resolvedId || undefined} />;
}
