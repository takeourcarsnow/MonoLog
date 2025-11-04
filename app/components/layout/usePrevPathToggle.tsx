"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Hook to toggle navigation to a target route while saving the previous
 * path in sessionStorage so the user can return back to where they were.
 *
 * Usage:
 * const { toggle, isActive } = usePrevPathToggle('/favorites', 'monolog:prev-path-before-favorites');
 */
export function usePrevPathToggle(targetPath: string, storageKey: string, defaultPrev = "/") {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = pathname === targetPath;

  const toggle = useCallback((e?: any) => {
    if (e?.preventDefault) e.preventDefault();
    const current = pathname || "/";

    if (current !== targetPath) {
      try { sessionStorage.setItem(storageKey, current); } catch (_) {}
      router.push(targetPath);
      return;
    }

    // Return to previous path
    let prev = defaultPrev;
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) prev = stored;
    } catch (_) {}
    if (prev === targetPath) prev = defaultPrev;
    try { sessionStorage.removeItem(storageKey); } catch (_) {}
    router.push(prev);
  }, [pathname, router, storageKey, targetPath, defaultPrev]);

  return { toggle, isActive };
}
