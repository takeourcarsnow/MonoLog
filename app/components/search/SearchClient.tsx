"use client";

import { usePageScroll } from "@/lib/hooks/usePageScroll";
import { useEffect } from 'react';

export function SearchClient({ children }: { children: React.ReactNode }) {
  usePageScroll('search-page-scroll');

  // Allow body scrolling for search page
  useEffect(() => {
    document.body.classList.add('search-page');
    return () => document.body.classList.remove('search-page');
  }, []);

  return <>{children}</>;
}