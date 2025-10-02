"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    
    async function redirectToUsername() {
      try {
        const user = await api.getCurrentUser();
        if (!mounted) return;
        
        if (user?.username) {
          router.replace(`/${user.username}`);
        } else if (user?.id) {
          router.replace(`/${user.id}`);
        } else {
          // User not logged in, redirect to home or login
          router.replace("/");
        }
      } catch (e) {
        if (mounted) {
          router.replace("/");
        }
      }
    }
    
    redirectToUsername();
    // Re-run redirect logic on auth changes (sign in/out) so the profile page
    // doesn't keep showing the previous user's profile without a hard refresh.
    function onAuthChanged() { redirectToUsername(); }
    if (typeof window !== 'undefined') window.addEventListener('auth:changed', onAuthChanged as any);
    return () => { mounted = false; };
  }, [router]);

  return <div className="p-6">Redirecting...</div>;
}