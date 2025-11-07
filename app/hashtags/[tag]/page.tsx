import { HashtagView } from "@/app/components/hashtag/HashtagView";
import { Hash } from "lucide-react";

interface HashtagPageProps {
  // `params` may be a Promise in some Next.js runtimes, so keep the type
  // flexible and await it where necessary.
  params: { tag: string } | Promise<{ tag: string }>;
}

export default async function HashtagPage({ params }: HashtagPageProps) {
  // Ensure we handle the case where params is a Promise (Next may provide
  // a promise-backed params in some environments). Awaiting is safe even if
  // params is a plain object.
  const resolved = await params;
  return <HashtagView tag={resolved.tag} />;
}

export async function generateMetadata({ params }: HashtagPageProps) {
  const resolved = await params;
  return {
    title: `#${resolved.tag} - MonoLog`,
    description: `Posts tagged with #${resolved.tag}`,
  };
}