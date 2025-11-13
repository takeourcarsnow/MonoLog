"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/app/components/ui/Button";
import { Send } from "lucide-react";

interface ReplyFormProps {
  threadId: string;
  onReplyAdded: (reply: any) => void;
  onReplyCountUpdate: (delta: number) => void;
}

export function ReplyForm({ threadId, onReplyAdded, onReplyCountUpdate }: ReplyFormProps) {
  const [newReply, setNewReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || submitting) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const reply = await api.addThreadReply(threadId, newReply.trim());
      onReplyAdded(reply);
      onReplyCountUpdate(1);
      setNewReply("");
    } catch (e: any) {
      // Error handling: surface message to the user and log for debugging
      const msg = e?.message || 'Failed to post reply';
      console.error(msg);
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card mb-6">
      <form onSubmit={handleSubmit}>
        <div className="space-y-3">
          <div className="relative w-full">
            <textarea
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder="Write a reply..."
              className="w-full p-3 pb-12 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white relative z-10"
              rows={3}
              maxLength={5000}
            />

            {/* Character counter inside the field (bottom-right) */}
            <div className="absolute z-30 text-sm text-gray-500 dark:text-gray-400 pointer-events-none" style={{ right: 12, bottom: 12 }}>
              {newReply.length}/5000
            </div>
          </div>
          
          {/* Show error directly under the textarea so it's clearly associated with the field */}
          {errorMsg && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {errorMsg}
            </div>
          )}
          <div className="flex justify-end items-center">
            <Button
              type="submit"
              variant="ghost"
              disabled={!newReply.trim() || submitting}
              loading={submitting}
              useSpinningLogo={true}
              className="no-effects"
              aria-label={submitting ? "Sending reply" : "Send reply"}
              title={submitting ? "Sending reply…" : "Send reply"}
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}