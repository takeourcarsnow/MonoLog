"use client";

import { ArrowLeft, Trash2, MessageSquare, Clock } from "lucide-react";
import type { HydratedThread } from "@/lib/types";
import { Button } from "@/app/components/ui/Button";
import TimeDisplay from "@/app/components/ui/TimeDisplay";
import Link from "next/link";
import { OptimizedImage } from "@/app/components/media/OptimizedImage";
import { renderCaption } from "@/lib/hashtags";

interface ThreadHeaderProps {
  thread: HydratedThread;
  communitySlug: string;
  currentUserId?: string;
  onDelete: () => void;
  deleteArmed: boolean;
}

export function ThreadHeader({ thread, communitySlug, currentUserId, onDelete, deleteArmed }: ThreadHeaderProps) {
  return (
    <>
      {/* Back Navigation */}
      <div style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
        <Link href={`/communities/${communitySlug}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
          <ArrowLeft size={16} />
          Back
        </Link>
      </div>

      {/* Thread Header - centered stacked layout */}
      <div className="card relative">
        {/* Delete button in corner for thread owner */}
        {currentUserId && thread.user.id === currentUserId && (
          // Move delete button to the top-left corner to match community card placement
          <div className="absolute left-3 top-3">
            <Button
              variant="danger"
              size="sm"
              className={`small-min ${deleteArmed ? 'confirm' : ''}`}
              onClick={onDelete}
              aria-label={deleteArmed ? 'Confirm delete thread' : 'Delete thread'}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )}

        <div className="flex flex-col items-center text-center gap-3 py-3">
          <h1 className="text-2xl font-bold">{thread.title}</h1>
          <div className="flex flex-col items-center gap-2 mt-1 text-sm text-gray-500">
            <div className="flex items-center gap-4 justify-center">
              <span className="inline-flex items-center gap-2">
                <Clock size={14} className="mr-1" />{"\u00A0"}
                <TimeDisplay date={thread.createdAt} />{"\u00A0"}
              </span>
              <span className="flex items-center gap-2">
                <MessageSquare size={14} />{"\u00A0"}
                <span>{thread.replyCount || 0}</span>{"\u00A0"}
              </span>
            </div>
            <Link href={`/${thread.user.username}`} className="inline-flex items-center justify-center" title={`@${thread.user.username}`} aria-label={`${thread.user.username}`}>
              <span>@{thread.user.username}</span>
            </Link>
          </div>
        </div>

        <div className="mt-2 prose dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap text-center">{renderCaption(thread.content)}</p>
        </div>
      </div>
    </>
  );
}