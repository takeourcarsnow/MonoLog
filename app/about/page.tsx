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

      <h3>How it works</h3>
      <p className="dim">MonoLog is built around a simple idea: one short visual entry per day. You can add up to five images to capture a moment, mood, or small story — no long posts, no pressure.</p>

      <h3>Why use MonoLog?</h3>
      <ul style={{ display: 'inline-block', textAlign: 'left', maxWidth: 680, padding: '0 8px' }}>
        <li>Focus: a single, compact entry each day keeps the habit light and approachable.</li>
        <li>Memory: the visual format makes it easy to skim months or years at a glance.</li>
        <li>Choice: keep posts private, publish them, or follow others — you control how you share.</li>
        <li>Sync: if you enable syncing, your posts are kept safely so you can access them from other devices.</li>
      </ul>

      <p className="dim">MonoLog is designed to be private, simple, and intentional — perfect for building a daily habit or keeping a low-effort visual record of life.</p>

      <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
        <Link className="btn icon-reveal" href="/explore" aria-label="Explore">
          <span className="icon" aria-hidden>
            {/* magnifier */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
          <span className="reveal">Explore</span>
        </Link>

        <Link className="btn primary icon-reveal" href="/upload" aria-label="Post">
          <span className="icon" aria-hidden>
            {/* camera icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7h3l2-2h6l2 2h3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
          <span className="reveal">Post</span>
        </Link>

        <a className="btn icon-reveal" href="https://nefas.tv" target="_blank" rel="noopener noreferrer" aria-label="Author">
          <span className="icon" aria-hidden>
            {/* author / link */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 20v-1c0-2.2 3.58-4 6-4s6 1.8 6 4v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
          <span className="reveal">Author</span>
        </a>
      </div>
    </div>
  );
}