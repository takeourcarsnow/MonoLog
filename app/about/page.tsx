"use client";
import Link from "next/link";
import { InstallButton } from "@/app/components/pwa/InstallButton";
import styles from './about.module.css';
import { useEffect, useRef, useState } from 'react';
import { Brain, Lock, Archive, Sparkles, Music, Calendar, Users, TrendingUp, Image as ImageIcon, MessageCircle, Award, Info, ChevronDown } from "lucide-react";
import { LogoIcon } from "../components/nav/LogoIcon";

export default function AboutPage() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    // Allow body scrolling for about page
    document.body.classList.add('about-page');

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
    return () => {
      document.body.classList.remove('about-page');
      io.disconnect();
    };
  }, []);

  const faqs = [
    {
      question: "How does the one post per day limit work?",
      answer: "You can create or update one post per day. This encourages mindful posting and helps build a consistent journaling habit. You can add multiple images to each post to tell a complete story."
    },
    {
      question: "Is my data private?",
      answer: "Yes. Your posts are private by default. We don't use algorithms, show ads, or sell your data. You control who sees your content through the follow system."
    },
    {
      question: "Can I use this offline?",
      answer: "MonoLog is a Progressive Web App (PWA) that works offline. Install it on your device for the best experience. Your posts will sync when you're back online."
    },
    {
      question: "What are communities for?",
      answer: "Communities let you connect with others around shared interests. Create threads, discuss topics, and build connections beyond your daily posts."
    }
  ];

  return (
  <div ref={cardRef} className={`${styles.aboutCard}`}>
  <div className={`${styles.topLogo} reveal`} data-reveal>
    <LogoIcon size={48} />
  </div>
      <h1 className={`${styles.aboutTitle} reveal`} data-reveal>MonoLog <span className="sr-only">— Your day in pictures.</span></h1>
      <p className={`${styles.aboutSubtitle} reveal`} data-reveal>
        Capture a meaningful moment each day in a private journal — build a lasting, ad-free archive of your life.
      </p>

      <div className={`${styles.aboutSection} reveal stagger`} data-reveal>
        <h2>The Philosophy</h2>
        <p>
          In a world of viral moments and endless scrolling, MonoLog is a quiet space for intentional reflection. 
          One post per day keeps you focused on what truly matters. Over time, these moments become a searchable 
          visual archive — personal, meaningful, and free from algorithmic pressure.
        </p>
      </div>

      <div className={styles.featuresSection}>
        <h2 className={`reveal`} data-reveal>Features & Values</h2>
        <div className={styles.featuresGrid}>
          <div className={`${styles.featureItem} reveal`} data-reveal>
            <Brain className={styles.featureIcon} size={24} />
            <h4>Mindful Daily Ritual</h4>
            <p>Intentional reflection through consistent photo journaling</p>
          </div>
          <div className={`${styles.featureItem} reveal`} data-reveal>
            <Archive className={styles.featureIcon} size={24} />
            <h4>Personal Archive</h4>
            <p>Build a chronological story of your life you can revisit anytime</p>
          </div>
          <div className={`${styles.featureItem} reveal`} data-reveal>
            <Lock className={styles.featureIcon} size={24} />
            <h4>True Privacy</h4>
            <p>Your moments stay yours — no algorithms, ads, or data collection</p>
          </div>
          <div className={`${styles.featureItem} reveal`} data-reveal>
            <ImageIcon className={styles.featureIcon} size={20} />
            <h4>Multiple Images</h4>
            <p>Add up to multiple photos per post to capture the full story</p>
          </div>
          <div className={`${styles.featureItem} reveal`} data-reveal>
            <Calendar className={styles.featureIcon} size={20} />
            <h4>Calendar View</h4>
            <p>Browse your history with an interactive visual calendar</p>
          </div>
          <div className={`${styles.featureItem} reveal`} data-reveal>
            <Users className={styles.featureIcon} size={20} />
            <h4>Communities</h4>
            <p>Join communities and start threads with like-minded people</p>
          </div>
          <div className={`${styles.featureItem} reveal`} data-reveal>
            <Music className={styles.featureIcon} size={20} />
            <h4>Spotify Integration</h4>
            <p>Link songs to your posts and share what you're listening to</p>
          </div>
          <div className={`${styles.featureItem} reveal`} data-reveal>
            <TrendingUp className={styles.featureIcon} size={20} />
            <h4>Week Review</h4>
            <p>Weekly statistics and insights about your journaling habits</p>
          </div>
          <div className={`${styles.featureItem} reveal`} data-reveal>
            <MessageCircle className={styles.featureIcon} size={20} />
            <h4>Social Features</h4>
            <p>Follow friends, leave comments, and favorite posts you love</p>
          </div>
        </div>
      </div>

      <div className={styles.faqSection}>
        <h2 className={`reveal`} data-reveal>Frequently Asked Questions</h2>
        <div className={styles.faqList}>
          {faqs.map((faq, index) => (
            <div key={index} className={`${styles.faqItem} reveal`} data-reveal>
              <button
                className={styles.faqQuestion}
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                aria-expanded={expandedFaq === index}
              >
                <span>{faq.question}</span>
                <ChevronDown className={`${styles.faqIcon} ${expandedFaq === index ? styles.faqIconExpanded : ''}`} size={20} />
              </button>
              <div className={`${styles.faqAnswer} ${expandedFaq === index ? styles.faqAnswerExpanded : ''}`}>
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`${styles.authorSection} reveal`} data-reveal>
        <InstallButton />
        <a className={styles.authorLink} href="https://nefas.tv" target="_blank" rel="noopener noreferrer" aria-label="Author">
          <Sparkles size={14} />
        </a>
        <a className={styles.authorLink} href="https://open.spotify.com/playlist/636w2DFH8yvdTRFhC5e5Ey" target="_blank" rel="noopener noreferrer" aria-label="Spotify Playlist">
          <Music size={14} />
        </a>
      </div>
    </div>
  );
}
