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
    return () => { mounted = false; };
  }, [router]);

  return <div className="p-6">Redirecting...</div>;
}