"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { HydratedPost, User } from "@/lib/types";
import Link from "next/link";

export function ProfileView({ userId }: { userId?: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<HydratedPost[]>([]);
  const [following, setFollowing] = useState<boolean | null>(null);
  const isOther = !!userId;

  useEffect(() => {
    (async () => {
      const u = userId ? await api.getUser(userId) : await api.getCurrentUser();
      if (!u) { setUser(null); return; }
      setUser(u);
      setPosts(await api.getUserPosts(u.id));
      if (userId) setFollowing(await api.isFollowing(u.id));
    })();
  }, [userId]);

  if (!user) {
    return <div className="empty">User not found. Pick an account from the Account menu to get started.</div>;
  }

  return (
    <div className="view-fade">
      <div className="profile-header toolbar">
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <img className="profile-avatar" src={user.avatarUrl} alt={user.displayName} />
          <div>
            <div className="username">{user.displayName}</div>
            <div className="dim">@{user.username} • joined {new Date(user.joinedAt).toLocaleDateString()}</div>
            {user.bio ? <div className="dim" style={{ marginTop: 6 }}>{user.bio}</div> : null}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!isOther ? (
            <>
              <Link className="btn" href="/upload">New Post</Link>
              <EditProfile />
            </>
          ) : (
            <button
              className="btn follow-btn"
              aria-pressed={!!following || false}
              onClick={async () => {
                if (!following) {
                  await api.follow(user.id);
                  setFollowing(true);
                } else {
                  await api.unfollow(user.id);
                  setFollowing(false);
                }
              }}
            >
              {following ? "Following" : "Follow"}
            </button>
          )}
        </div>
      </div>

      <div style={{ height: 8 }} />
      <div className="grid" aria-label="User posts">
        {posts.map(p => (
          <Link key={p.id} className="tile" href={`/post/${p.id}`}>
            <img loading="lazy" src={p.imageUrl} alt={p.alt || "Photo"} />
          </Link>
        ))}
      </div>
    </div>
  );
}

function EditProfile() {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [original, setOriginal] = useState("");

  useEffect(() => {
    (async () => {
      const me = await api.getCurrentUser();
      setBio(me?.bio || "");
      setOriginal(me?.bio || "");
    })();
  }, []);

  if (!editing) {
    return <button className="btn edit-profile-btn" onClick={() => setEditing(true)}>Edit Profile</button>;
  }

  return (
    <div>
      <div>
        <textarea
          className="bio-editor"
          rows={3}
          style={{ width: 320 }}
          value={bio}
          onChange={e => setBio(e.target.value)}
        />
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button
          className="btn save-bio"
          onClick={async () => {
            await api.updateCurrentUser({ bio: bio.trim() });
            setEditing(false);
          }}
        >
          Save
        </button>
        <button
          className="btn cancel-bio"
          onClick={() => { setBio(original); setEditing(false); }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}