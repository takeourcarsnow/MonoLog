"use client";

import { useState } from "react";
import { Trash2, Edit3, Check, X, Clock } from "lucide-react";
import type { HydratedThreadReply } from "@/lib/types";
import { Button } from "@/app/components/ui/Button";
import TimeDisplay from "@/app/components/ui/TimeDisplay";
import Link from "next/link";
import { OptimizedImage } from "@/app/components/media/OptimizedImage";
import { renderCaption } from "@/lib/hashtags";
import { api } from "@/lib/api";

interface ReplyItemProps {
  reply: HydratedThreadReply;
  currentUserId?: string;
  onUpdate: (replyId: string, updatedReply: HydratedThreadReply) => void;
  onDelete: (replyId: string) => void;
}

export function ReplyItem({ reply, currentUserId, onUpdate, onDelete }: ReplyItemProps) {
  const [editing, setEditing] = useState(false);
  const [editingContent, setEditingContent] = useState(reply.content);
  const [saving, setSaving] = useState(false);

  const handleEdit = () => {
    setEditing(true);
    setEditingContent(reply.content);
  };

  const handleSave = async () => {
    if (!editingContent.trim()) return;

    try {
      setSaving(true);
      const updatedReply = await api.editThreadReply(reply.id, editingContent.trim());
      onUpdate(reply.id, updatedReply);
      setEditing(false);
    } catch (e: any) {
      console.error(e?.message || 'Failed to edit reply');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setEditingContent(reply.content);
  };

  return (
    <div className="card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="flex-shrink-0 mr-2">
              <Link href={`/${reply.user.username}`}>
                <OptimizedImage
                  src={(reply.user.avatarUrl || "").trim() || "/logo.svg"}
                  alt={reply.user.username}
                  width={24}
                  height={24}
                  className="avatar rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                />
              </Link>
            </div>
            <Link href={`/${reply.user.username}`} className="font-medium" title={`@${reply.user.username}`} aria-label={`${reply.user.username}`}>
              @{reply.user.username}
            </Link>
            <span className="inline-flex items-center gap-2"><Clock size={12} className="mr-1" />{"\u00A0"}<TimeDisplay date={reply.createdAt} /></span>
          </div>
          {currentUserId && reply.user.id === currentUserId && (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="small-min no-effects"
                onClick={handleEdit}
                disabled={editing}
                aria-label="Edit reply"
              >
                <Edit3 size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="small-min no-effects"
                onClick={() => onDelete(reply.id)}
                aria-label="Delete reply"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )}
        </div>
        {editing ? (
          <div className="mt-3 space-y-3">
            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              rows={3}
              maxLength={5000}
              disabled={saving}
            />
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {editingContent.length}/5000 characters
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={saving}
                  className="no-effects"
                >
                  <X size={14} className="mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!editingContent.trim() || saving}
                  loading={saving}
                  className="no-effects"
                >
                  <Check size={14} className="mr-1" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2 prose dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">{renderCaption(reply.content)}</p>
          </div>
        )}
      </div>
    </div>
  );
}