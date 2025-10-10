"use client";

import { api } from "@/src/lib/api";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export function DeleteAccountButton() {
  const router = useRouter();
  const [confirmArm, setConfirmArm] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <>
      <button
        className={`btn icon delete-account-btn no-effects ${confirmArm ? "confirm" : ""}`}
        title={confirmArm ? "Click again to permanently delete your account" : "Delete account"}
        aria-label={confirmArm ? "Click again to permanently delete your account" : "Delete account"}
        onClick={async () => {
          // First click arms the confirm; second click within timeout performs deletion
          if (!confirmArm) {
            setConfirmArm(true);
            if (timerRef.current) window.clearTimeout(timerRef.current);
            timerRef.current = window.setTimeout(() => setConfirmArm(false), 3000); // Longer timeout for destructive action
            return;
          }

          // second click: perform account deletion
          if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          setConfirmArm(false);
          try {
            await api.deleteCurrentUser?.();
            // Redirect to explore after deletion
            router.push("/explore");
          } catch (e) {
            console.warn("Delete account error", e);
            alert("Failed to delete account. Please try again.");
          }
        }}
        aria-pressed={confirmArm}
      >
        <span className="icon" aria-hidden>
          {/* trash/delete icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 11v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </button>
    </>
  );
}