"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/app/components/ui/Button";
import Link from "next/link";
import { useThread } from "./useThread";
import { useReplies } from "./useReplies";
import { useThreadActions } from "./useThreadActions";
import { ThreadHeader } from "./ThreadHeader";
import { ReplyForm } from "./ReplyForm";
import { RepliesList } from "./RepliesList";
import { ThreadSkeleton } from "./ThreadSkeleton";

export function ThreadView() {
  const params = useParams();
  const router = useRouter();
  const { me: currentUser } = useAuth();
  const communitySlug = params.slug as string;
  const threadSlug = params.threadSlug as string;

  const { thread, loading: threadLoading, error: threadError, updateReplyCount } = useThread(threadSlug, communitySlug);
  const { replies, addReply, updateReply, deleteReply } = useReplies(thread?.id);
  const { deleteArmed, handleDelete } = useThreadActions(thread?.id, () => router.push(`/communities/${communitySlug}`));

  // Redirect unauthenticated users to auth
  useEffect(() => {
    if (!currentUser) { // undefined or null means not authenticated
      router.replace('/profile');
    }
  }, [currentUser, router]);

  // Show loading while determining auth status
  if (currentUser === undefined) {
    return null;
  }

  // Don't render anything if not authenticated (redirecting)
  if (!currentUser) {
    return null;
  }

  if (threadLoading) {
    return <ThreadSkeleton />;
  }

  if (threadError || !thread) {
    return (
      <div className="content thread">
        <div className="content-body">
          <div className="card">
            <p className="text-red-500">{threadError || 'Thread not found'}</p>
            <Link href={`/communities/${communitySlug}`}>
              <Button>Back to Community</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content thread">
      <ThreadHeader
        thread={thread}
        communitySlug={communitySlug}
        currentUserId={currentUser.id}
        onDelete={handleDelete}
        deleteArmed={deleteArmed}
      />

      {/* Replies Section */}
      <div className="content-body mt-8">
        <ReplyForm
          threadId={thread.id}
          onReplyAdded={addReply}
          onReplyCountUpdate={updateReplyCount}
        />

        <RepliesList
          replies={replies}
          currentUserId={currentUser.id}
          onReplyUpdate={updateReply}
          onReplyDelete={deleteReply}
          onReplyCountUpdate={updateReplyCount}
        />
      </div>
    </div>
  );
}