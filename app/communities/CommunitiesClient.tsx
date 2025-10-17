"use client";
import React, { PropsWithChildren } from 'react';
import { usePageScroll } from "@/src/lib/hooks/usePageScroll";

export default function CommunitiesClient({ children }: PropsWithChildren) {
  usePageScroll('communities-page-scroll');

  return <>{children}</>;
}
