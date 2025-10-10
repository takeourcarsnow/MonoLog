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

  // manage global escape handling and body scroll when modal is open
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
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow || "";
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
          <div
            className="modal-overlay"
            role="presentation"
            onMouseDown={() => {
              // clicking backdrop cancels
              setConfirmArm(false);
              setConfirmText("");
              setError(null);
              if (timerRef.current) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
              }
            }}
          >
            <div
              className="modal delete-confirm-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-account-title"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <h2 id="delete-account-title">Confirm account deletion</h2>
              <p className="muted">Type <strong>delete</strong> to permanently delete your account.</p>

              <div className="delete-confirm-input">
                <input
                  ref={inputRef}
                  className="input"
                  aria-label="Type delete to confirm account deletion"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      if (confirmText.trim().toLowerCase() === "delete") {
                        // trigger deletion
                        e.preventDefault();
                        await performDelete();
                      }
                    }
                  }}
                  placeholder="Type delete to confirm"
                />
              </div>

              <div className="delete-confirm-buttons">
                <button
                  className="btn small danger"
                  onClick={async () => {
                    await performDelete();
                  }}
                  disabled={loading || confirmText.trim().toLowerCase() !== "delete"}
                  aria-disabled={loading || confirmText.trim().toLowerCase() !== "delete"}
                  title="Delete account"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>

                <button
                  className="btn small"
                  onClick={() => {
                    setConfirmArm(false);
                    setConfirmText("");
                    setError(null);
                    if (timerRef.current) {
                      window.clearTimeout(timerRef.current);
                      timerRef.current = null;
                    }
                  }}
                  title="Cancel"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 6l12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>

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