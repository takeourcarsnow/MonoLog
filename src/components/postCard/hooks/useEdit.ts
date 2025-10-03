import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { useToast } from "../../Toast";
import type { HydratedPost } from "@/lib/types";

export function useEdit(post: HydratedPost, setPost: (post: HydratedPost) => void) {
  const [editing, setEditing] = useState(false);
  const [editExpanded, setEditExpanded] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const editTimerRef = useRef<number | null>(null);
  const editorRef = useRef<{ save: () => Promise<void>; cancel?: () => void } | null>(null);
  const toast = useToast();

  const handleSave = async (patch: any) => {
    setEditorSaving(true);
    try {
      const updated = await api.updatePost(post.id, patch);
      setPost(updated);
      setEditing(false);
    } catch (e: any) {
      toast.show(e?.message || "Failed to update post");
    } finally {
      setEditorSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
  };

  return {
    editing,
    setEditing,
    editExpanded,
    setEditExpanded,
    editTimerRef,
    editorSaving,
    editorRef,
    handleSave,
    handleCancel
  };
}