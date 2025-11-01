"use client";

import { useState, useRef } from "react";
import { api } from "@/src/lib/api";
import type { HydratedThreadReply } from "@/src/lib/types";
import { ReplyItem } from "./ReplyItem";

interface RepliesListProps {
  replies: HydratedThreadReply[];
  currentUserId?: string;
  onReplyUpdate: (replyId: string, updatedReply: HydratedThreadReply) => void;
  onReplyDelete: (replyId: string) => void;
  onReplyCountUpdate: (delta: number) => void;
}

export function RepliesList({ replies, currentUserId, onReplyUpdate, onReplyDelete, onReplyCountUpdate }: RepliesListProps) {
  const [armedSet, setArmedSet] = useState<Set<string>>(new Set());
  const timeoutsRef = useRef<Map<string, number>>(new Map());

  const handleDelete = async (replyId: string) => {
    // If not armed, arm the reply delete and set timeout
    if (!armedSet.has(replyId)) {
      const next = new Set(armedSet);
      next.add(replyId);
      setArmedSet(next);
      // set/replace timeout
      const prev = timeoutsRef.current.get(replyId);
      if (prev) window.clearTimeout(prev);
      const t = window.setTimeout(() => {
        const s = new Set(armedSet);
        s.delete(replyId);
        setArmedSet(s);
        timeoutsRef.current.delete(replyId);
      }, 6000);
      timeoutsRef.current.set(replyId, t);
      return;
    }

    // Confirmed: perform delete
    try {
      const prev = timeoutsRef.current.get(replyId);
      if (prev) window.clearTimeout(prev);
      timeoutsRef.current.delete(replyId);
      await api.deleteThreadReply(replyId);
      onReplyDelete(replyId);
      onReplyCountUpdate(-1);
      // remove armed state
      const s = new Set(armedSet);
      s.delete(replyId);
      setArmedSet(s);
    } catch (e: any) {
      console.error(e?.message || 'Failed to delete reply');
    }
  };

  if (replies.length === 0) {
    return (
      <div className="card">
        <p className="text-gray-500 text-center">No replies yet. Be the first to reply!</p>
      </div>
    );
  }

  return (
    <>
      {replies.map((reply) => (
        <ReplyItem
          key={reply.id}
          reply={reply}
          currentUserId={currentUserId}
          onUpdate={onReplyUpdate}
          onDelete={handleDelete}
        />
      ))}
    </>
  );
}