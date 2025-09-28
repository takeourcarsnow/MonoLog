"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { HydratedPost } from "@/lib/types";
import { PostCard } from "./PostCard";
import Link from "next/link";

function ViewToggle({ title, selected, onSelect }: { title: string; selected: "list" | "grid"; onSelect: (v: "list" | "grid") => void }) {
  return (
    <div className="view-toggle">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <strong>{title}</strong>
        <div className="dim">All recent public posts</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button className={`btn ${selected === "list" ? "primary" : ""}`} onClick={() => onSelect("list")} title="List view">List</button>
        <button className={`btn ${selected === "grid" ? "primary" : ""}`} onClick={() => onSelect("grid")} title="Grid view">Grid</button>
      </div>
    </div>
  );
}

export function ExploreView() {
  const [posts, setPosts] = useState<HydratedPost[]>([]);
  const [view, setView] = useState<"list" | "grid">((typeof window !== "undefined" && (localStorage.getItem("exploreView") as any)) || "grid");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await api.getExploreFeed();
      setPosts(data);
      setLoading(false);
    })();
  }, []);

  const render = () => {
    if (loading) return <div className="card skeleton" style={{ height: 240 }} />;
    if (!posts.length) return <div className="empty">No posts yet. Be the first to post your daily photo!</div>;
    if (view === "grid") {
      return (
        <div className="grid">
          {posts.map(p => (
            <Link key={p.id} className="tile" href={`/post/${p.id}`}>
              <img loading="lazy" src={p.imageUrl} alt={p.alt || "Photo"} />
            </Link>
          ))}
        </div>
      );
    }
    return posts.map(p => <PostCard key={p.id} post={p} />);
  };

  return (
    <div className="view-fade">
      <ViewToggle
        title="Explore"
        selected={view}
        onSelect={(v) => { setView(v); if (typeof window !== "undefined") localStorage.setItem("exploreView", v); }}
      />
      <div className="feed">{render()}</div>
    </div>
  );
}