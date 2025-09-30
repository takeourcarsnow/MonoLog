"use client";

import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="btn icon-reveal"
      title="Sign out"
      aria-label="Sign out"
      onClick={async () => {
        try {
          await api.signOut?.();
        } catch (e) {
          console.warn("Sign out error", e);
        } finally {
          // navigate to home/landing (explore)
          router.push("/explore");
          // refresh to ensure UI updates
          router.refresh();
          try { window.dispatchEvent(new CustomEvent('auth:changed')); } catch (e) { /* ignore */ }
        }
      }}
    >
      <span className="icon" aria-hidden>
        {/* logout icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M13 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </span>
      <span className="reveal">Sign out</span>
    </button>
  );
}
