"use client";
import { useEffect } from "react";
import Link from "next/link";
import Portal from "./Portal";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  useEffect(() => {
    if (isOpen) document.body.classList.add("modal-blur");
    return () => document.body.classList.remove("modal-blur");
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        role="dialog"
        aria-modal={true}
        aria-labelledby="about-title"
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 20,
          background: "rgba(0,0,0,0.6)",
          animation: "modalIn 200ms ease-out",
        }}
        onClick={onClose}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "var(--bg)",
            overflow: "auto",
            WebkitOverflowScrolling: "touch",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <button
              className="btn ghost"
              onClick={onClose}
              aria-label="Close about modal"
              style={{ position: "absolute", top: 16, right: 16, padding: 8 }}
            >
              ✕
            </button>

            <main style={{ width: "min(680px, 92vw)", margin: "5rem auto 2rem", padding: "1.5rem 1.75rem", borderRadius: 10 }}>
              <h1 id="about-title" style={{ margin: 0, fontSize: "1.9rem", fontWeight: 700, letterSpacing: '-0.01em' }}>MonoLog</h1>
              <p style={{ margin: "0.6rem 0 1rem", fontSize: "1.05rem", color: "var(--muted, #6b6b6b)", lineHeight: 1.6 }}>
                A private, chronological journal — one short post per day. No algorithms, no public likes.
              </p>

              <div style={{ display: 'grid', gap: '0.6rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>Why it matters</div>
                <div style={{ fontSize: '0.95rem', color: 'var(--muted, #6b6b6b)', lineHeight: 1.6 }}>
                  Keep a simple, personal archive of moments and thoughts that&#39;s yours.
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem', display: 'grid', gap: '0.5rem' }}>
                <div style={{ fontSize: '1rem' }}><strong>Daily</strong> — one short post to capture a moment.</div>
                <div style={{ fontSize: '1rem' }}><strong>Chronological</strong> — your story in order.</div>
                <div style={{ fontSize: '1rem' }}><strong>Private</strong> — share on your terms.</div>
              </div>

              <section style={{ marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>Quick ritual</h2>
                <div style={{ display: 'grid', gap: '0.6rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.1rem' }}>📸</span>
                    <div style={{ textAlign: 'center' }}><strong>Capture</strong><div style={{ fontSize: '0.9rem', color: 'var(--muted, #6b6b6b)' }}>Photo + note</div></div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.1rem' }}>👥</span>
                    <div style={{ textAlign: 'center' }}><strong>Follow</strong><div style={{ fontSize: '0.9rem', color: 'var(--muted, #6b6b6b)' }}>See friends&#39; moments</div></div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.1rem' }}>📅</span>
                    <div style={{ textAlign: 'center' }}><strong>Relive</strong><div style={{ fontSize: '0.9rem', color: 'var(--muted, #6b6b6b)' }}>Browse by date</div></div>
                  </div>
                </div>
              </section>

              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--muted, #6b6b6b)' }}>
                Built for memory, not attention.
              </p>
            </main>
          </div>
        </div>
      </div>
    </Portal>
  );
}