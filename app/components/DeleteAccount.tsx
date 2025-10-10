"use client";

import { api } from "@/src/lib/api";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export function DeleteAccountButton() {
  const router = useRouter();
  const [confirmArm, setConfirmArm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  // manage Escape handling when popover is open
  useEffect(() => {
    if (!confirmArm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConfirmArm(false);
        setConfirmText("");
        setError(null);
        if (timerRef.current) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [confirmArm]);

  return (
    <>
      <div className="delete-account-btn-wrapper">
        <button
          className={`btn icon delete-account-btn no-effects ${confirmArm ? "confirm" : ""}`}
          title={confirmArm ? "Confirm deletion" : "Delete account"}
          aria-label={confirmArm ? "Confirm deletion" : "Delete account"}
          onClick={() => {
            if (!confirmArm) {
              setConfirmArm(true);
              setConfirmText("");
              setError(null);
              // auto-cancel after 30s
              if (timerRef.current) window.clearTimeout(timerRef.current);
              timerRef.current = window.setTimeout(() => setConfirmArm(false), 30000);
              // focus the input after a tick
              setTimeout(() => inputRef.current?.focus(), 50);
            } else {
              setConfirmArm(false);
              setConfirmText("");
              setError(null);
              if (timerRef.current) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
              }
            }
          }}
          aria-pressed={confirmArm}
        >
          <span className="icon" aria-hidden>
            {/* trash/delete icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
        </button>

        {confirmArm ? (
          <div className="confirm-popover" role="dialog" aria-labelledby="delete-account-title" onMouseDown={(e) => e.stopPropagation()}>
            <div className="confirm-popover-arrow" aria-hidden />
            <div className="confirm-popover-body">
              <h3 id="delete-account-title">Permanently delete your account</h3>

              <input
                ref={inputRef}
                className="input"
                aria-label="Type delete to confirm account deletion"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    if (confirmText.trim().toLowerCase() === "delete") {
                      e.preventDefault();
                      await performDelete();
                    }
                  }
                }}
                placeholder="Type delete to confirm"
              />

              {error ? <p className="error">{error}</p> : null}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );

  async function performDelete() {
    if (loading) return;
    if (confirmText.trim().toLowerCase() !== "delete") {
      setError("Please type 'delete' to confirm.");
      return;
    }
    setLoading(true);
    setError(null);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    try {
      await api.deleteCurrentUser?.();
      // Redirect to explore after deletion
      router.push("/explore");
    } catch (e) {
      console.warn("Delete account error", e);
      setError("Failed to delete account. Please try again.");
      setLoading(false);
    }
  }
}