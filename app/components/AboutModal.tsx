"use client";
import { useEffect } from "react";
import Link from "next/link";
import Portal from "./Portal";
import styles from '../about/about.module.css';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-blur');
    } else {
      document.body.classList.remove('modal-blur');
    }

    return () => {
      document.body.classList.remove('modal-blur');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal={true}
        aria-labelledby="about-title"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
          zIndex: 20,
          background: 'rgba(0,0,0,0.6)',
          animation: 'modalIn 200ms ease-out'
        }}
        onClick={onClose}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 720,
            background: 'var(--bg)',
            borderRadius: 12,
            padding: 24,
            maxHeight: '90vh',
            overflow: 'auto',
            willChange: 'transform, opacity, filter'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 id="about-title" style={{ margin: 0 }}>About MonoLog</h2>
            <button
              className="btn ghost"
              onClick={onClose}
              aria-label="Close about modal"
              style={{ padding: '8px', margin: 0 }}
            >
              ✕
            </button>
          </div>

          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <p className="dim" style={{ margin: '1em auto 1.5em' }}>
              MonoLog is a daily photo journal that respects your time and attention. No infinite scrolling, no public like counts, and no algorithm deciding what you see — just a simple, intentional way to document your life and connect with people you actually care about.
            </p>

            <section style={{ marginBottom: '1.5em' }}>
              <h3>Why MonoLog exists</h3>
              <p className="dim" style={{ margin: '0.5em auto' }}>
                Many social platforms are optimized to maximize attention and engagement. MonoLog takes a different path: one post per calendar day (create or replace today's entry), no pressure to perform, and a chronological feed so your memories remain yours — not content for an algorithm.
              </p>

              <p className="dim" style={{ margin: '0.8em auto', fontStyle: 'italic' }}>
                Community driven — MonoLog is built and sustained by the community. There is no venture funding, no commercial backers, and no advertising partnerships. The project is guided by users and volunteers.
              </p>
            </section>

            <section style={{ marginBottom: '1.5em' }}>
              <h3>How it's different from Instagram</h3>
              <ul className={styles.aboutList}>
                <li><strong>One post per calendar day</strong> — No spam, no overthinking. Create (or replace) a single entry per local calendar day with up to five images. If you posted late in the evening you may post again the next morning once the local date rolls over.</li>
                <li><strong>Favorites instead of public likes</strong> — You can favorite posts you love; there are no public like counts to chase.</li>
                <li><strong>Chronological feed</strong> — See posts from people you follow in the order they were posted. No algorithmic ranking.</li>
                <li><strong>Privacy control</strong> — Choose whether a post is public or private. You control your sharing.</li>
                <li><strong>No ads, no tracking</strong> — Your data isn't sold and your attention isn't monetized.</li>
                <li><strong>Calm by design</strong> — Minimal notifications and no engagement metrics to distract you.</li>
              </ul>
            </section>

            <section style={{ marginBottom: '1.5em' }}>
              <h3>What you can do</h3>
              <ul className={styles.aboutList}>
                <li><strong>Post</strong> — Create one entry per calendar day with up to five images and a caption. You can replace today's entry if you want to revise it.</li>
                <li><strong>Feed</strong> — Follow friends and see their daily posts in a clean, chronological timeline.</li>
                <li><strong>Explore</strong> — Discover public posts from the community at your own pace.</li>
                <li><strong>Calendar</strong> — View your entire photo journal in calendar form and jump to any date.</li>
                <li><strong>Engage</strong> — Leave comments and favorite posts you love, without the pressure of public metrics.</li>
              </ul>
            </section>

            <p className="dim" style={{ margin: '1em auto' }}>
              MonoLog is for people who want to document their lives without being consumed by social media. It's a tool for memory, not a platform for performance. Simple, intentional, and driven by the community that uses it.
            </p>

            <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link className="btn icon-reveal" href="/explore" onClick={onClose} aria-label="Explore">
                <span className="icon" aria-hidden>
                  {/* magnifier */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span className="reveal">Explore</span>
              </Link>

              <Link className="btn primary icon-reveal" href="/upload" onClick={onClose} aria-label="Post">
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
      </div>
    </Portal>
  );
}