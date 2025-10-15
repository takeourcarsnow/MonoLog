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

  useEffect(() => {
    // Scroll reveal with IntersectionObserver + CSS-driven stagger
    if (typeof window === 'undefined') return;

    const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));

    if (prefersReduced) {
      els.forEach((el) => el.classList.add('inView'));
      return;
    }

    els.forEach((el, i) => {
      if (!el.style.getPropertyValue('--index')) el.style.setProperty('--index', String(i));
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const t = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          t.classList.add('inView');
          io.unobserve(t);
        }
      });
    }, { threshold: 0.12 });

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
  <div ref={cardRef} className={`${styles.aboutCard}`}>
  <div className={`${styles.topLogo} reveal`} data-reveal>
    <LogoIcon size={48} />
  </div>
      <h1 className={`${styles.aboutTitle} reveal`} data-reveal>MonoLog <span className="sr-only">— Your day in pictures.</span></h1>
      <p className={`${styles.aboutSubtitle} reveal`} data-reveal>
        Capture a meaningful moment each day in a private journal — build a lasting, ad-free archive.
      </p>

      <div className={`${styles.aboutSection} reveal stagger`} data-reveal>
        <h2>The Idea</h2>
        <p>
          In a world of viral moments and endless scrolling, this is a quiet place to record one
          meaningful post and a few words each day. Over time those small entries become a
          searchable archive for reflection — personal and free from algorithmic pressure.
        </p>
      </div>

      <div className={styles.highlightsSection}>
        <h2>Why It Matters</h2>
        <div className={styles.highlightsGrid}>
          <div className={`${styles.highlightItem} reveal`} data-reveal>
            <Brain className={styles.highlightIcon} size={24} />
            <h3>Mindful Daily Ritual</h3>
            <p>Intentional reflection through consistent photo journaling</p>
          </div>
          <div className={`${styles.highlightItem} reveal`} data-reveal>
            <Lock className={styles.highlightIcon} size={24} />
            <h3>True Privacy</h3>
            <p>Your moments stay yours — no algorithms, no ads, no data collection</p>
          </div>
          <div className={`${styles.highlightItem} reveal`} data-reveal>
            <Archive className={styles.highlightIcon} size={24} />
            <h3>Personal Archive</h3>
            <p>Build a chronological story of your life that you can revisit anytime</p>
          </div>
        </div>
      </div>

      <div className={`${styles.installSection} reveal`} data-reveal>
        <InstallButton />
      </div>

      <a className={`${styles.authorLink} reveal`} data-reveal href="https://nefas.tv" target="_blank" rel="noopener noreferrer" aria-label="Author">
        <Sparkles size={14} />
      </a>
    </div>
  );
}
