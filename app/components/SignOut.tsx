"use client";

import { api } from "@/src/lib/api";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export function SignOutButton() {
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
        className={`btn icon signout-btn no-effects ${confirmArm ? "confirm" : ""}`}
        title={confirmArm ? "Click again to confirm sign out" : "Sign out"}
        aria-label={confirmArm ? "Click again to confirm sign out" : "Sign out"}
        onClick={async () => {
          // First click arms the confirm; second click within timeout performs sign-out
          if (!confirmArm) {
            setConfirmArm(true);
            if (timerRef.current) window.clearTimeout(timerRef.current);
            timerRef.current = window.setTimeout(() => setConfirmArm(false), 2600);
            return;
          }

          // second click: perform sign out
          if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          setConfirmArm(false);
          try {
            await api.signOut?.();
          } catch (e) {
            console.warn("Sign out error", e);
          } finally {
            router.push("/explore");
          }
        }}
        aria-pressed={confirmArm}
      >
        <span className="icon" aria-hidden>
          {/* logout icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </button>
    </>
  );
}
