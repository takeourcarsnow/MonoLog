"use client";

import { useState } from "react";
import { api } from "@/src/lib/api";
import { Button } from "../Button";

interface ReplyFormProps {
  threadId: string;
  onReplyAdded: (reply: any) => void;
  onReplyCountUpdate: (delta: number) => void;
}

export function ReplyForm({ threadId, onReplyAdded, onReplyCountUpdate }: ReplyFormProps) {
  const [newReply, setNewReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || submitting) return;

    try {
      setSubmitting(true);
      const reply = await api.addThreadReply(threadId, newReply.trim());
      onReplyAdded(reply);
      onReplyCountUpdate(1);
      setNewReply("");
    } catch (e: any) {
      // Error handling can be passed up or handled here
      console.error(e?.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card mb-6">
      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          <textarea
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            placeholder="Write a reply..."
            className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            rows={3}
            maxLength={5000}
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {newReply.length}/5000 characters
            </span>
            <Button
              type="submit"
              disabled={!newReply.trim() || submitting}
              loading={submitting}
            >
              Post Reply
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}