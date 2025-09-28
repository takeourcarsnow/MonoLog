"use client";
import { ProfileView } from "@/components/ProfileView";

export default function ProfileIdPage({ params }: { params: { id: string } }) {
  return <ProfileView userId={params.id} />;
}