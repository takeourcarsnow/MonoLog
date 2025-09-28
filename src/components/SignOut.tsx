"use client";

import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="btn"
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
        }
      }}
    >
      Sign out
    </button>
  );
}
