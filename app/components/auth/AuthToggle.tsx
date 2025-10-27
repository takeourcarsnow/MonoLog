// AuthToggle.tsx
import { useState, useRef, useEffect } from "react";
import { throttle } from "@/src/lib/utils";

interface AuthToggleProps {
  mode: "signin" | "signup";
  setMode: (mode: "signin" | "signup") => void;
}

export function AuthToggle({ mode, setMode }: AuthToggleProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const btnSigninRef = useRef<HTMLButtonElement | null>(null);
  const btnSignupRef = useRef<HTMLButtonElement | null>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    let raf = 0;

    function measure() {
      const c = containerRef.current;
      const a = btnSigninRef.current;
      const b = btnSignupRef.current;
      if (!c || !a || !b) return;
      const crect = c.getBoundingClientRect();
      const arect = a.getBoundingClientRect();
      const brect = b.getBoundingClientRect();
      const leftA = Math.round(arect.left - crect.left);
      const leftB = Math.round(brect.left - crect.left);
      const widthA = Math.round(arect.width);
      const widthB = Math.round(brect.width);
      const next = mode === 'signin' ? { left: leftA, width: widthA } : { left: leftB, width: widthB };
      // Only update when values changed to avoid churn inside RO callbacks
      setIndicator((prev) => {
        if (prev.left === next.left && prev.width === next.width) return prev;
        return next;
      });
    }

    // Debounced initial measurement + window resize handler uses rAF to avoid
    // making style writes directly inside ResizeObserver callbacks which can
    // lead to the "ResizeObserver loop completed with undelivered
    // notifications" message in some browsers.
    function scheduleMeasure() {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        measure();
      });
    }

    // Run initial measurement
    scheduleMeasure();
    const onResize = scheduleMeasure;
    window.addEventListener('resize', onResize, { passive: true });

    // watch for font/load/layout changes
    const ro = new ResizeObserver(throttle(() => {
      scheduleMeasure();
    }, 80));
    if (containerRef.current) ro.observe(containerRef.current);
    if (btnSigninRef.current) ro.observe(btnSigninRef.current);
    if (btnSignupRef.current) ro.observe(btnSignupRef.current);

    // also ensure we re-measure when DOM subtree mutates
    const mo = new MutationObserver(() => scheduleMeasure());
    if (containerRef.current) mo.observe(containerRef.current, { childList: true, subtree: true, attributes: true });

    return () => {
      try { if (raf) cancelAnimationFrame(raf); } catch (_) {}
      window.removeEventListener('resize', onResize);
      try { ro.disconnect(); } catch (_) {}
      try { mo.disconnect(); } catch (_) {}
    };
  }, [mode]);

  return (
    <div
      ref={containerRef}
      className="auth-toggle relative glow-wrap"
      role="tablist"
      aria-label="Auth mode"
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* sliding active indicator */}
      <div
        aria-hidden
        className="auth-toggle-indicator"
        style={{ left: indicator.left, width: indicator.width }}
      />

      <div style={{ display: 'inline-flex', gap: 8, position: 'relative', zIndex: 5 }}>
        <button
          ref={btnSigninRef}
          type="button"
          className={`btn pill-switch ${mode === 'signin' ? 'active' : ''}`}
          onClick={() => setMode('signin')}
          aria-pressed={mode === 'signin'}
        >
          <span className="btn-label">Sign in</span>
        </button>
        <button
          ref={btnSignupRef}
          type="button"
          className={`btn pill-switch ${mode === 'signup' ? 'active' : ''}`}
          onClick={() => setMode('signup')}
          aria-pressed={mode === 'signup'}
        >
          <span className="btn-label">Sign up</span>
        </button>
      </div>
    </div>
  );
}