"use client";
import Link from "next/link";
import { InstallButton } from "../components/InstallButton";
import styles from './about.module.css';

export default function AboutPage() {
  return (
  <div className={`card view-fade about-card ${styles.aboutCard}`} style={{ padding: 18, textAlign: 'center' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h2>Welcome to MonoLog</h2>

        <p className="dim" style={{ margin: '1em auto 1.5em', fontSize: '1.1em' }}>
          MonoLog is your personal daily photo journal designed to help you capture and share life&apos;s moments without the distractions of traditional social media. It&apos;s simple, intentional, and focused on what truly matters — your memories and connections.
        </p>

        <section style={{ marginBottom: '1.5em' }}>
          <h3>What Makes MonoLog Special</h3>
          <p className="dim" style={{ margin: '0.5em auto' }}>
            Unlike platforms that compete for your attention, MonoLog respects your time with one meaningful post per day, no endless scrolling, and no public likes to chase. It&apos;s a calm space to document your life and connect with the people who matter most.
          </p>
        </section>

        <section style={{ marginBottom: '1.5em' }}>
          <h3>Key Features</h3>
          <ul className={styles.aboutList}>
            <li><strong>One Post Per Day</strong> — Share up to five photos with a caption each calendar day. Replace your entry anytime before midnight to perfect it.</li>
            <li><strong>Private Favorites</strong> — Show appreciation with favorites that stay between you and the creator — no public counts or pressure.</li>
            <li><strong>Chronological Feed</strong> — See posts from friends in the order they were shared, preserving the natural flow of time.</li>
            <li><strong>Privacy First</strong> — Choose to make posts public for the community or keep them private for personal reflection.</li>
            <li><strong>Ad-Free Experience</strong> — No ads, no tracking, no algorithms — your data and attention remain yours.</li>
            <li><strong>Minimal Distractions</strong> — Focused design with gentle notifications and no engagement metrics to disrupt your peace.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '1.5em' }}>
          <h3>Get Started</h3>
          <ul className={styles.aboutList}>
            <li><strong>Post Daily</strong> — Upload your photos and write a caption to create today&apos;s entry.</li>
            <li><strong>Follow & Connect</strong> — Build your feed by following friends and seeing their daily shares.</li>
            <li><strong>Explore the Community</strong> — Discover inspiring posts from other users at your own pace.</li>
            <li><strong>View Your Journal</strong> — Browse your photo history in calendar view and revisit any day.</li>
            <li><strong>Engage Meaningfully</strong> — Leave thoughtful comments and favorite posts that resonate with you.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '1.5em' }}>
          <h3>Community Driven</h3>
          <p className="dim" style={{ margin: '0.5em auto', fontStyle: 'italic' }}>
            MonoLog is built by and for its users. No corporate backing or venture capital — just a passionate community creating a better way to share life&apos;s moments.
          </p>
        </section>

        <p className="dim" style={{ margin: '1em auto' }}>
          Ready to start your photo journal? Join thousands of users who have rediscovered the joy of intentional sharing.
        </p>

        <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
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

          <InstallButton />

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
