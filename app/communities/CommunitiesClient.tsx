"use client";
import React, { PropsWithChildren, useEffect } from 'react';
import { usePageScroll } from "@/lib/hooks/usePageScroll";

export default function CommunitiesClient({ children }: PropsWithChildren) {
  usePageScroll('communities-page-scroll');

  // Update last checked time when component mounts
  useEffect(() => {
    localStorage.setItem('communitiesLastChecked', new Date().toISOString());
  }, []);

  // Allow body scrolling for communities page
  useEffect(() => {
    document.body.classList.add('communities-page');
    return () => document.body.classList.remove('communities-page');
  }, []);

  return <>{children}</>;
}
