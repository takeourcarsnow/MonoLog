"use client";

import { usePageScroll } from "@/src/lib/hooks/usePageScroll";

export function SearchClient({ children }: { children: React.ReactNode }) {
  usePageScroll('search-page-scroll');
  return <>{children}</>;
}