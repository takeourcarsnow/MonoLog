"use client";
import Link from "next/link";
import { InstallButton } from "../components/InstallButton";
import styles from './about.module.css';
import { useEffect, useRef } from 'react';
import { Brain, Lock, Archive, Sparkles } from "lucide-react";
import { LogoIcon } from "../components/nav/LogoIcon";

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
  <div className={styles.topLogo}>
    <LogoIcon size={48} />
  </div>
      <h1 className={styles.aboutTitle}>MonoLog <span className="sr-only">— Your day in pictures.</span></h1>
      <p className={styles.aboutSubtitle}>
        MonoLog is a private, chronological photo journal — one thoughtful post per day. No chasing likes, no algorithmic feeds.
      </p>

      <div className={styles.aboutSection}>
        <h2>The Idea</h2>
        <p>
          In a world of viral moments and endless scrolling, MonoLog offers a quiet alternative.
          Capture meaningful moments daily through photos and notes, building a coherent narrative
          of your life — intentional, private, and yours alone.
        </p>
        <p>
          While social platforms chase engagement, MonoLog preserves what matters.
          Your posts build a personal legacy, creating space for genuine expression.
        </p>
      </div>

      <div className={styles.highlightsSection}>
        <h2>Why It Matters</h2>
        <div className={styles.highlightsGrid}>
          <div className={styles.highlightItem}>
            <Brain className={styles.highlightIcon} size={24} />
            <h3>Mindful Daily Ritual</h3>
            <p>Intentional reflection through consistent photo journaling</p>
          </div>
          <div className={styles.highlightItem}>
            <Lock className={styles.highlightIcon} size={24} />
            <h3>True Privacy</h3>
            <p>Your moments stay yours — no algorithms, no ads, no data collection</p>
          </div>
          <div className={styles.highlightItem}>
            <Archive className={styles.highlightIcon} size={24} />
            <h3>Personal Archive</h3>
            <p>Build a chronological story of your life that you can revisit anytime</p>
          </div>
        </div>
      </div>

      <div className={styles.installSection}>
        <InstallButton />
      </div>

      <a className={styles.authorLink} href="https://nefas.tv" target="_blank" rel="noopener noreferrer" aria-label="Author">
        <Sparkles size={14} />
      </a>
    </div>
  );
}
