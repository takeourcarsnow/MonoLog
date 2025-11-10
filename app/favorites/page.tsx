"use client";
import { FavoritesView } from "@/app/components/favorites/FavoritesView";
import { useEffect } from 'react';

export default function Page() {
  // Allow body scrolling for favorites page
  useEffect(() => {
    document.body.classList.add('favorites-page');
    return () => document.body.classList.remove('favorites-page');
  }, []);

  return (
    <main className="page favorites">
      <h1 className="sr-only">Favorites</h1>
      <FavoritesView />
    </main>
  );
}
