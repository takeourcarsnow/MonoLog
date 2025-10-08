"use client";
import Link from "next/link";
import { InstallButton } from "../components/InstallButton";
import styles from './about.module.css';
import { useEffect, useRef } from 'react';

export default function AboutPage() {
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Allow body scrolling on about page
    document.body.classList.add('about-page-scroll');
    document.documentElement.classList.add('about-page-scroll');

    return () => {
      // Clean up when component unmounts
      document.body.classList.remove('about-page-scroll');
      document.documentElement.classList.remove('about-page-scroll');
    };
  }, []);

  return (
  <div ref={cardRef} className={`${styles.aboutCard}`}>
      <h1 className={styles.aboutTitle}>MonoLog</h1>
      <p className={styles.aboutSubtitle}>
        MonoLog is a private, chronological photo journal — one thoughtful post per day. No chasing likes, no algorithmic feeds.
      </p>

      <div className={styles.aboutSection}>
        <h2>Why it matters</h2>
        <p>
          Keep a simple, personal archive of moments and thoughts that&#39;s yours.
        </p>
      </div>

      <div className={styles.aboutSection}>
        <div className={styles.featureList}>
          <div className={styles.featureItem}><strong>Daily</strong> — one post per day to collect the moments that matter.</div>
          <div className={styles.featureItem}><strong>Chronological</strong> — your story in order.</div>
          <div className={styles.featureItem}><strong>Private</strong> — share on your terms.</div>
        </div>
      </div>

      <div className={styles.aboutSection}>
        <h2>Quick ritual</h2>
        <div className={styles.ritualGrid}>
          <div className={styles.ritualItem}>
            <span className={styles.ritualIcon}>📸</span>
            <div>
              <div className={styles.ritualTitle}>Capture</div>
              <div className={styles.ritualDesc}>Multiple photos + a short note</div>
            </div>
          </div>

          <div className={styles.ritualItem}>
            <span className={styles.ritualIcon}>👥</span>
            <div>
              <div className={styles.ritualTitle}>Follow</div>
              <div className={styles.ritualDesc}>See friends&#39; moments</div>
            </div>
          </div>

          <div className={styles.ritualItem}>
            <span className={styles.ritualIcon}>📅</span>
            <div>
              <div className={styles.ritualTitle}>Relive</div>
              <div className={styles.ritualDesc}>Browse by date</div>
            </div>
          </div>
        </div>
      </div>

      <p className={styles.footerText}>
        Built for memory, not attention.
      </p>

      <a className={styles.authorLink} href="https://nefas.tv" target="_blank" rel="noopener noreferrer" aria-label="Author">
        <span className="icon" aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* author / link */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 20v-1c0-2.2 3.58-4 6-4s6 1.8 6 4v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </span>
      </a>
    </div>
  );
}
