"use client";

import { useEffect, useRef, useState } from "react";
import { api, getSupabaseClient } from "@/lib/api";
import { compressImage } from "@/lib/image";
import { uid } from "@/lib/id";
import type { HydratedPost, User } from "@/lib/types";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { SignOutButton } from "@/components/SignOut";

export function ProfileView({ userId }: { userId?: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<HydratedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isOther = !!userId;

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // determine signed-in user (if any) so we can tell if the viewed profile is the owner
        const me = await api.getCurrentUser();
        if (!mounted) return;
        setCurrentUserId(me?.id || null);

        const u = userId ? await api.getUser(userId) : me;
        if (!mounted) return;
        if (!u) { setUser(null); setPosts([]); if (userId) setFollowing(false); return; }
        setUser(u);
        setPosts(await api.getUserPosts(u.id));
        if (userId) setFollowing(await api.isFollowing(u.id));
      } catch (e) {
        // swallow and let UI show not-found if appropriate
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  const [showAuth, setShowAuth] = useState(false);

  if (!user) {
    // while loading, show a neutral skeleton instead of 'User not found'
    if (loading) {
      return (
        <div className="view-fade">
          <div className="card skeleton" style={{ height: 120, maxWidth: 800, margin: '24px auto' }} />
          <div className="grid" aria-label="User posts">
            <div className="tile skeleton" style={{ height: 160 }} />
          </div>
        </div>
      );
    }

    return (
      <div className="empty" style={{ position: "relative" }}>
        <div>User not found. Pick an account from the Account menu to get started.</div>
        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={() => setShowAuth(true)}>Sign in / Sign up</button>
        </div>

        {showAuth ? (
          <>
            <div
              onClick={() => setShowAuth(false)}
              style={{ position: "fixed", inset: 0, zIndex: 40 }}
            />
            <div style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 50, background: "var(--bg)", padding: 16, borderRadius: 8 }}>
              <AuthForm onClose={() => setShowAuth(false)} />
            </div>
          </>
        ) : null}
      </div>
    );
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
                <EditProfile onSaved={async () => {
                  // refresh the profile and posts after an edit so UI reflects changes immediately
                  const me = await api.getCurrentUser();
                  setUser(me);
                  if (me) setPosts(await api.getUserPosts(me.id));
                }} />
              {/* show sign out only when the viewed profile belongs to the signed-in user */}
              {currentUserId && user?.id === currentUserId ? <SignOutButton /> : null}
            </>
          ) : (
            <button
              className="btn follow-btn"
              aria-pressed={!!following || false}
              onClick={async () => {
                const cur = await api.getCurrentUser();
                if (!cur) {
                  setShowAuth(true);
                  return;
                }
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

function EditProfile({ onSaved }: { onSaved?: () => Promise<void> | void } = {}) {
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [original, setOriginal] = useState("");
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [originalDisplayName, setOriginalDisplayName] = useState("");
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const me = await api.getCurrentUser();
      setBio(me?.bio || "");
      setOriginal(me?.bio || "");
      setUsername(me?.username || "");
      setOriginalUsername(me?.username || "");
      setDisplayName(me?.displayName || "");
      setOriginalDisplayName(me?.displayName || "");
    })();
  }, []);

  if (!editing) {
    return <button className="btn edit-profile-btn" onClick={() => setEditing(true)}>Edit Profile</button>;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <input
          type="file"
          accept="image/*"
          ref={fileRef}
          style={{ display: "none" }}
          onChange={async () => {
            const f = fileRef.current?.files?.[0];
            if (!f) return;
            setProcessing(true);
            try {
              // compress to data URL then upload to storage
              const dataUrl = await compressImage(f);
              // convert dataUrl -> File
              const parts = dataUrl.split(',');
              const meta = parts[0];
              const mime = meta.split(':')[1].split(';')[0];
              const bstr = atob(parts[1]);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while (n--) u8arr[n] = bstr.charCodeAt(n);
              const file = new File([u8arr], `${uid()}.jpg`, { type: mime });

              const sb = getSupabaseClient();
              const { data: userData, error: authErr } = await sb.auth.getUser();
              // stringify helpers for paste-friendly logs
              const s = (v: any) => {
                try { return JSON.stringify(v, null, 2); } catch (e) { try { return String(v); } catch { return "[unserializable]"; } }
              };
              console.debug("auth.getUser result", s({ userData, authErr }));
              const user = (userData as any)?.user;
              if (!user) throw new Error("Not logged in");
              const path = `avatars/${user.id}/${file.name}`;
              console.debug("Uploading avatar to storage", { path, fileName: file.name, fileSize: file.size, fileType: file.type });
              const { data: uploadData, error: uploadErr } = await sb.storage.from("posts").upload(path, file, { upsert: true });
              console.debug("storage.upload result (stringified)", s({ uploadData, uploadErr }));
              if (uploadErr) {
                try {
                  console.error("storage.upload error details (stringified)", s({
                    message: (uploadErr as any)?.message || uploadErr,
                    status: (uploadErr as any)?.status || (uploadErr as any)?.statusCode || null,
                    details: (uploadErr as any)?.details || (uploadErr as any)?.error || null,
                    full: uploadErr,
                  }));
                } catch (ee) {
                  console.error("Failed to stringify uploadErr", ee, uploadErr);
                }
                throw uploadErr;
              }
              const urlRes = sb.storage.from("posts").getPublicUrl(path);
              console.debug("storage.getPublicUrl result (stringified)", s(urlRes));
              const publicUrl = urlRes.data.publicUrl;
              // persist avatar URL to profile (log payload/result)
              console.debug("Calling api.updateCurrentUser", { avatarUrl: publicUrl });
              try {
                const upd = await api.updateCurrentUser({ avatarUrl: publicUrl });
                console.debug("api.updateCurrentUser success (stringified)", s(upd));
              } catch (e) {
                console.error("api.updateCurrentUser failed", e);
                throw e;
              }
              // refresh local bio to ensure UI reflects latest profile (optional)
            } catch (e: any) {
              console.error(e);
              alert(e?.message || "Failed to upload avatar");
            } finally {
              setProcessing(false);
            }
          }}
        />
        <button className="btn" onClick={() => fileRef.current?.click()} disabled={processing}>
          {processing ? "Uploading…" : "Change Avatar"}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="dim">Display name</span>
          <input className="input" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Display name" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="dim">Username (used in @handle)</span>
          <input className="input" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="username" />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="dim">Bio</span>
          <textarea
            className="bio-editor"
            rows={3}
            style={{ width: 320 }}
            value={bio}
            onChange={e => setBio(e.target.value)}
          />
        </label>
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button
          className="btn save-bio"
              onClick={async () => {
            // basic validation
            const uname = username.trim();
            if (!uname) { alert("Username cannot be empty"); return; }
            setProcessing(true);
            try {
              await api.updateCurrentUser({ username: uname, displayName: displayName.trim() || undefined, bio: bio.trim() });
              setEditing(false);
              try { await onSaved?.(); } catch (e) { /* ignore parent refresh errors */ }
            } catch (e: any) {
              alert(e?.message || "Failed to update profile");
            } finally {
              setProcessing(false);
            }
          }}
        >
          Save
        </button>
        <button
          className="btn cancel-bio"
          onClick={() => {
            setBio(original);
            setUsername(originalUsername);
            setDisplayName(originalDisplayName);
            setEditing(false);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}