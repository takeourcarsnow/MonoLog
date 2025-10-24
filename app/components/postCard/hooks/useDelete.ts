import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/src/lib/api";
import { useToast } from "../../Toast";

export function useDelete(postId: string) {
  const [deleteExpanded, setDeleteExpanded] = useState(false);
  const [showConfirmText, setShowConfirmText] = useState(false);
  const deleteExpandTimerRef = useRef<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  // cleanup any pending delete expand timer when component unmounts
  useEffect(() => {
    return () => {
      if (deleteExpandTimerRef.current) {
        clearTimeout(deleteExpandTimerRef.current);
        deleteExpandTimerRef.current = null;
      }
    };
  }, []);

  const handleDeleteActivation = async () => {
    if (deleteExpanded) {
      // Proceed with deletion
      try {
        (document.getElementById(`post-${postId}`)?.remove?.());
        await api.deletePost(postId);
        // Dispatch event to notify other components (e.g., feed) that post was deleted
        window.dispatchEvent(new CustomEvent('monolog:post_deleted', { detail: { postId } }));
        if (pathname?.startsWith("/post/")) router.push("/");
      } catch (e: any) {
        toast.show(e?.message || "Failed to delete post");
      } finally {
        setDeleteExpanded(false);
        setShowConfirmText(false);
        if (deleteExpandTimerRef.current) {
          clearTimeout(deleteExpandTimerRef.current);
          deleteExpandTimerRef.current = null;
        }
      }
      return;
    }

    // Enter expanded state and clear after timeout
    setDeleteExpanded(true);
    setShowConfirmText(true);
    if (deleteExpandTimerRef.current) {
      clearTimeout(deleteExpandTimerRef.current);
      deleteExpandTimerRef.current = null;
    }
    deleteExpandTimerRef.current = window.setTimeout(() => {
      setDeleteExpanded(false);
      setShowConfirmText(false);
      deleteExpandTimerRef.current = null;
    }, 3500);
  };

  return {
    deleteExpanded,
    setDeleteExpanded,
    showConfirmText,
    deleteExpandTimerRef,
    handleDeleteActivation
  };
}
