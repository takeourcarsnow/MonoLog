"use client";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="card view-fade" style={{ padding: 18 }}>
      <h2>About MonoLog</h2>

      <p className="dim">MonoLog is a minimal daily photo journal designed to be simple and low-friction. You can attach multiple images to a single post (up to 5), but the app limits you to one post per calendar day — a lightweight way to collect moments without letting your feed fill up.</p>

      <h3>How it works</h3>
      <ul>
        <li><strong>Post</strong> — create one entry per day. Attach up to 5 images to tell a little story or share a few related shots.</li>
        <li><strong>Feed</strong> — follow people and see their daily posts in a simple timeline.</li>
        <li><strong>Explore</strong> — browse public posts from the community if authors make them public.</li>
        <li><strong>Calendar</strong> — jump to any date to review past posts.</li>
      </ul>

      <h3>Privacy & storage</h3>
      <p className="dim">By default MonoLog stores posts locally in your browser (LocalStorage). That keeps your data on your device unless you enable a remote backend. To sync across devices, switch to the Supabase mode and provide the appropriate environment variables.</p>

      <p className="dim">This project is intentionally compact — a focused tool for a daily photo practice or a starting point for a bigger product.</p>

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <Link className="btn primary" href="/upload">Post</Link>
        <Link className="btn" href="/explore">Explore</Link>
      </div>
    </div>
  );
}