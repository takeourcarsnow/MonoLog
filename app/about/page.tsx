"use client";

export default function AboutPage() {
  return (
    <div className="card view-fade" style={{ padding: 18 }}>
      <h2>Welcome to MonoLog</h2>
      <p className="dim">
        MonoLog is a tiny, local-first prototype for keeping a simple daily photo journal — one photo per day.
        It's designed for low-friction posting and focused discovery.
      </p>
      <h3>How it works</h3>
      <ul>
        <li>Post one photo per day from the <strong>Post</strong> tab.</li>
        <li>Explore public posts from everyone, or follow people to see them in your <strong>Feed</strong>.</li>
        <li>Use the calendar to browse posts by date.</li>
      </ul>
      <h3>Local-first</h3>
      <p className="dim">
        This demo stores data in your browser (local storage). To try multiple users, use the Account menu to switch between accounts.
      </p>
      <p className="dim">It's intentionally minimal — a starting point for a personal daily-photo app.</p>
      <div style={{ marginTop: 12 }}>
        <a className="btn" href="/explore">Get started</a>
      </div>
    </div>
  );
}