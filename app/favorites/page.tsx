import { FavoritesView } from "@/app/components/FavoritesView";

export default function Page() {
  return (
    <main className="page favorites">
      <h1 className="sr-only">Favorites</h1>
      <FavoritesView />
    </main>
  );
}
