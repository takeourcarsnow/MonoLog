"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/hooks/useAuth";

export const dynamic = 'force-dynamic';

export default function Page() {
  const { me, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (me) {
        router.push('/feed');
      } else {
        router.push('/explore');
      }
    }
  }, [me, isLoading, router]);

  return <div>Loading...</div>; // Or a proper loading component
}
