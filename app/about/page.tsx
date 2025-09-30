"use client";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="card view-fade" style={{ padding: 18, textAlign: 'center' }}>
      <h2>About MonoLog</h2>

      <p className="dim">MonoLog is a small, distraction‑free daily photo journal. Add up to five images to a single entry and keep one post per day — a gentle way to capture the moments that matter.</p>

      <h3>At a glance</h3>
      <ul style={{ display: 'inline-block', textAlign: 'left', maxWidth: 680, padding: '0 8px' }}>
        <li><strong>Post</strong> — one entry per day. Combine up to five images into a short visual note.</li>
        <li><strong>Feed</strong> — follow people and browse their daily posts in a simple timeline.</li>
        <li><strong>Explore</strong> — discover public posts from the community.</li>
        <li><strong>Calendar</strong> — jump to any date to review past entries.</li>
      </ul>

      <h3>Privacy & storage</h3>
      <p className="dim">By default your posts stay on your device (LocalStorage). Enable the Supabase backend if you want syncing across devices — otherwise your data remains local unless you choose to publish it.</p>

      <p className="dim">Designed to be compact and intentional: use MonoLog as a daily habit tool or as a lightweight starting point for a larger project.</p>

      <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <Link className="btn primary" href="/upload">Post</Link>
        <Link className="btn" href="/explore">Explore</Link>
        <a className="btn" href="https://nefas.tv" target="_blank" rel="noopener noreferrer">Author</a>
      </div>
    </div>
  );
}