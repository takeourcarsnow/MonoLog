"use client";
import { PostView } from "@/components/PostView";

export default function PostIdPage({ params }: { params: { id: string } }) {
  return <PostView id={params.id} />;
}