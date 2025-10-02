"use client";
import Link from "next/link";
import styles from './about.module.css';

export default function AboutPage() {
  return (
  <div className={`card view-fade about-card ${styles.aboutCard}`} style={{ padding: 18, textAlign: 'center' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h2>About MonoLog</h2>

        <p className="dim" style={{ margin: '1em auto 1.5em' }}>
          MonoLog is a daily photo journal that respects your time and attention. No infinite scrolling, no public like counts, and no algorithm deciding what you see — just a simple, intentional way to document your life and connect with people you actually care about.
        </p>

        <section style={{ marginBottom: '1.5em' }}>
          <h3>Why MonoLog exists</h3>
          <p className="dim" style={{ margin: '0.5em auto' }}>
            Many social platforms are optimized to maximize attention and engagement. MonoLog takes a different path: one post per day, no pressure to perform, and a chronological feed so your memories remain yours — not content for an algorithm.
          </p>

          <p className="dim" style={{ margin: '0.8em auto', fontStyle: 'italic' }}>
            Community driven — MonoLog is built and sustained by the community. There is no venture funding, no commercial backers, and no advertising partnerships. The project is guided by users and volunteers.
          </p>
        </section>

        <section style={{ marginBottom: '1.5em' }}>
          <h3>How it&apos;s different from Instagram</h3>
          <ul className={styles.aboutList}>
            <li><strong>One post per day</strong> — No spam, no overthinking. Just one daily entry with up to five images.</li>
            <li><strong>Favorites instead of public likes</strong> — You can favorite posts you love; there are no public like counts to chase.</li>
            <li><strong>Chronological feed</strong> — See posts from people you follow in the order they were posted. No algorithmic ranking.</li>
            <li><strong>Privacy control</strong> — Choose whether a post is public or private. You control your sharing.</li>
            <li><strong>No ads, no tracking</strong> — Your data isn&apos;t sold and your attention isn&apos;t monetized.</li>
            <li><strong>Calm by design</strong> — Minimal notifications and no engagement metrics to distract you.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '1.5em' }}>
          <h3>What you can do</h3>
          <ul className={styles.aboutList}>
            <li><strong>Post</strong> — Create one entry per day with up to five images and a caption.</li>
            <li><strong>Feed</strong> — Follow friends and see their daily posts in a clean, chronological timeline.</li>
            <li><strong>Explore</strong> — Discover public posts from the community at your own pace.</li>
            <li><strong>Calendar</strong> — View your entire photo journal in calendar form and jump to any date.</li>
            <li><strong>Engage</strong> — Leave comments and favorite posts you love, without the pressure of public metrics.</li>
          </ul>
        </section>

        <p className="dim" style={{ margin: '1em auto' }}>
          MonoLog is for people who want to document their lives without being consumed by social media. It&apos;s a tool for memory, not a platform for performance. Simple, intentional, and driven by the community that uses it.
        </p>

        <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center' }}>
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
    </div>
  );
}