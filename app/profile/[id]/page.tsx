"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileIdPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  useEffect(() => {
    // Redirect old profile/[id] routes to the new username format
    router.replace(`/${params.id}`);
  }, [params.id, router]);

  return <div className="p-6">Redirecting...</div>;
}