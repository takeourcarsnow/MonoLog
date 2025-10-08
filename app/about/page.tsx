"use client";
import Link from "next/link";
import { InstallButton } from "../components/InstallButton";
import styles from './about.module.css';

export default function AboutPage() {
  return (
  <div className={`card view-fade about-card ${styles.aboutCard}`} style={{ padding: 12, textAlign: 'center', marginTop: '1rem' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 id="about-title" style={{ margin: 0, fontSize: "1.7rem", fontWeight: 700, letterSpacing: '-0.01em' }}>MonoLog</h1>
        <p style={{ margin: "0.3rem 0 0.5rem", fontSize: "1rem", color: "var(--muted, #6b6b6b)", lineHeight: 1.4 }}>
          A private, chronological journal — one short post per day. No algorithms, no public likes.
        </p>

        <div style={{ display: 'grid', gap: '0.3rem', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>Why it matters</div>
          <div style={{ fontSize: '0.9rem', color: 'var(--muted, #6b6b6b)', lineHeight: 1.4 }}>
            Keep a simple, personal archive of moments and thoughts that&#39;s yours.
          </div>
        </div>

        <div style={{ marginBottom: '0.6rem', display: 'grid', gap: '0.25rem' }}>
          <div style={{ fontSize: '0.95rem' }}><strong>Daily</strong> — one short post to capture a moment.</div>
          <div style={{ fontSize: '0.95rem' }}><strong>Chronological</strong> — your story in order.</div>
          <div style={{ fontSize: '0.95rem' }}><strong>Private</strong> — share on your terms.</div>
        </div>

        <section style={{ marginBottom: '0.6rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Quick ritual</h2>
          <div style={{ display: 'grid', gap: '0.3rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: '1rem' }}>📸</span>
              <div style={{ textAlign: 'center' }}><strong>Capture</strong><div style={{ fontSize: '0.85rem', color: 'var(--muted, #6b6b6b)' }}>Photo + note</div></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: '1rem' }}>👥</span>
              <div style={{ textAlign: 'center' }}><strong>Follow</strong><div style={{ fontSize: '0.85rem', color: 'var(--muted, #6b6b6b)' }}>See friends&#39; moments</div></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: '1rem' }}>📅</span>
              <div style={{ textAlign: 'center' }}><strong>Relive</strong><div style={{ fontSize: '0.85rem', color: 'var(--muted, #6b6b6b)' }}>Browse by date</div></div>
            </div>
          </div>
        </section>

        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted, #6b6b6b)' }}>
          Built for memory, not attention.
        </p>

        <div style={{ marginTop: 7, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a className="" href="https://nefas.tv" target="_blank" rel="noopener noreferrer" aria-label="Author" style={{ appearance: 'none', border: 'none', background: 'transparent', color: 'var(--text)', padding: '8px', fontSize: '14px', lineHeight: 1, cursor: 'pointer', fontWeight: 600, position: 'relative', overflow: 'hidden', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="icon" aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* author / link */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 20v-1c0-2.2 3.58-4 6-4s6 1.8 6 4v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
