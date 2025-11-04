"use client";

import { useState, useRef } from "react";
import { api } from "@/lib/api";

export function useThreadActions(threadId: string | undefined, onSuccess: () => void) {
  const [deleteArmed, setDeleteArmed] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleDelete = async () => {
    if (!threadId) return;
    // Two-step confirm: arm on first click, delete on second
    if (!deleteArmed) {
      setDeleteArmed(true);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setDeleteArmed(false), 6000);
      return;
    }

    try {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      await api.deleteThread(threadId);
      onSuccess();
    } catch (e: any) {
      console.error(e?.message || 'Failed to delete thread');
    } finally {
      setDeleteArmed(false);
    }
  };

  return {
    deleteArmed,
    handleDelete,
  };
}