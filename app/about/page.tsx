"use client";

export default function AboutPage() {
  return (
    <div className="card view-fade" style={{ padding: 18 }}>
      <h2>About MonoLog</h2>
      <p className="dim">MonoLog is a minimal, local-first daily photo journal: one photo per day. It focuses on simplicity, low friction posting, and a calm way to capture small moments.</p>

      <h3>Quick tour</h3>
      <ul>
        <li><strong>Post</strong> — add today’s photo. One photo per day keeps the app simple and focused.</li>
        <li><strong>Feed</strong> — follow accounts and see posts from people you follow.</li>
        <li><strong>Explore</strong> — browse public posts from the community (if you enable public mode).</li>
        <li><strong>Calendar</strong> — jump to posts by date for quick review.</li>
      </ul>

      <h3>Local-first & privacy</h3>
      <p className="dim">By default MonoLog stores data in your browser (LocalStorage). That means your posts stay on your device unless you opt into a remote backend. For remote persistence across devices, configure the Supabase mode in the environment variables.</p>

      <p className="dim">This project is intentionally small — a starting point for a personal daily-photo practice or a prototype for a larger product.</p>

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <a className="btn primary" href="/upload">Post</a>
        <a className="btn" href="/explore">Explore</a>
      </div>
    </div>
  );
}