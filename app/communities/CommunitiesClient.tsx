"use client";
import React, { useEffect, PropsWithChildren } from 'react';

export default function CommunitiesClient({ children }: PropsWithChildren) {
  useEffect(() => {
    // Allow body/html scrolling while this component is mounted
    if (typeof document !== 'undefined') {
      document.body.classList.add('communities-page-scroll');
      document.documentElement.classList.add('communities-page-scroll');
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('communities-page-scroll');
        document.documentElement.classList.remove('communities-page-scroll');
      }
    };
  }, []);

  return <>{children}</>;
}
