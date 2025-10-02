import { FavoritesView } from "@/components/FavoritesView";

export default function Page() {
  return (
    <main className="page">
      <h1 className="sr-only">Favorites</h1>
      <FavoritesView />
    </main>
  );
}
