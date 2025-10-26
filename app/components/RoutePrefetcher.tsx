"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Prefetch common routes for better performance
export default function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    // Prefetch common routes after initial load
    const timer = setTimeout(() => {
      router.prefetch('/explore');
      router.prefetch('/favorites');
      router.prefetch('/communities');
      router.prefetch('/profile');
    }, 2000); // Delay to not interfere with initial page load

    return () => clearTimeout(timer);
  }, [router]);

  return null;
}