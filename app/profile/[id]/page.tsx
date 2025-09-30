"use client";
import { useEffect, useState } from "react";
import { ProfileView } from "@/components/ProfileView";
import { supabaseApi } from "@/lib/api/supabase";

function looksLikeUuid(s: string) {
  // loose check: UUIDs usually contain hyphens and are long
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(s);
}

export default function ProfileIdPage({ params }: { params: { id: string } }) {
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function resolve() {
      const raw = params.id;
      if (looksLikeUuid(raw)) {
        if (!mounted) return;
        setResolvedId(raw);
        return;
      }
      try {
        // try to resolve username to user id
        const user = await supabaseApi.getUserByUsername?.(raw);
        if (!mounted) return;
        if (user && user.id) setResolvedId(user.id);
        else setNotFound(true);
      } catch (e) {
        if (!mounted) return;
        setNotFound(true);
      }
    }
    resolve();
    return () => { mounted = false; };
  }, [params.id]);

  if (notFound) return <div className="p-6">User not found</div>;
  if (!resolvedId) return <div className="p-6">Loading...</div>;
  return <ProfileView userId={resolvedId} />;
}