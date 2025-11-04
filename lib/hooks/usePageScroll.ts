"use client";

import { useEffect } from 'react';

/**
 * Hook to add page-specific scroll classes to html and body elements.
 * This enables scrolling for pages that need it, overriding default overflow:hidden.
 * @param className The class name to add (e.g., 'favorites-page-scroll')
 */
export function usePageScroll(className: string) {
  useEffect(() => {
    try {
      document.documentElement.classList.add(className);
      document.body.classList.add(className);
    } catch (e) {
      // Ignore errors if DOM not ready
    }
    return () => {
      try {
        document.documentElement.classList.remove(className);
        document.body.classList.remove(className);
      } catch (e) {
        // Ignore errors
      }
    };
  }, [className]);
}