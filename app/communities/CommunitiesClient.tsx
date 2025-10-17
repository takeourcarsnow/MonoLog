"use client";
import React, { PropsWithChildren, useEffect } from 'react';
import { usePageScroll } from "@/src/lib/hooks/usePageScroll";

export default function CommunitiesClient({ children }: PropsWithChildren) {
  usePageScroll('communities-page-scroll');

  // Update last checked time when component mounts
  useEffect(() => {
    localStorage.setItem('communitiesLastChecked', new Date().toISOString());
  }, []);

  return <>{children}</>;
}
