import { HashtagView } from "@/app/components/HashtagView";
import { Hash } from "lucide-react";

interface HashtagPageProps {
  params: { tag: string };
}

export default function HashtagPage({ params }: HashtagPageProps) {
  return <HashtagView tag={params.tag} />;
}

export async function generateMetadata({ params }: HashtagPageProps) {
  return {
    title: `#${params.tag} - MonoLog`,
    description: `Posts tagged with #${params.tag}`,
  };
}