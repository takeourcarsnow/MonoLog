"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { HydratedPost } from "@/lib/types";
import { PostCard } from "./PostCard";
import Link from "next/link";

function ViewToggle({ selected, onSelect }: { selected: "list" | "grid"; onSelect: (v: "list" | "grid") => void }) {
  return (
    <div className="view-toggle">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <strong>Following</strong>
        <div className="dim">Only people you follow</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button className={`btn ${selected === "list" ? "primary" : ""}`} onClick={() => onSelect("list")} title="List view">List</button>
        <button className={`btn ${selected === "grid" ? "primary" : ""}`} onClick={() => onSelect("grid")} title="Grid view">Grid</button>
      </div>
    </div>
  );
}

export function FeedView() {
  const [posts, setPosts] = useState<HydratedPost[]>([]);
  const [view, setView] = useState<"list" | "grid">((typeof window !== "undefined" && (localStorage.getItem("feedView") as any)) || "list");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await api.getFollowingFeed();
      setPosts(data);
      setLoading(false);
    })();
  }, []);

  const render = () => {
    if (loading) return <div className="card skeleton" style={{ height: 240 }} />;
    if (!posts.length) return <div className="empty">Your feed is quiet. Follow people in Explore to see their daily photo.</div>;
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
      <ViewToggle selected={view} onSelect={(v) => { setView(v); if (typeof window !== "undefined") localStorage.setItem("feedView", v); }} />
      <div className="feed">{render()}</div>
    </div>
  );
}