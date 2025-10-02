"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastCtx = {
  show: (message: string, timeout?: number) => void;
};
const Ctx = createContext<ToastCtx>({ show: () => {} });

// Duration (ms) of the CSS exit animation (keep in sync with globals.css @keyframes toastOut)
const EXIT_MS = 260; // keep roughly in sync with toastOut duration (visual affordance)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<{ hide?: number }>({});
  const lastId = useRef(0); // force reflow / restart animation when showing a new toast quickly

  const clearTimers = () => {
    if (timers.current.hide) window.clearTimeout(timers.current.hide);
    timers.current = {};
  };

  const show = useCallback((m: string, timeout = 2000) => {
    clearTimers();
    const sentence = m && m.length > 0 ? m[0].toUpperCase() + m.slice(1) : m;
    lastId.current += 1;
    setLeaving(false);
    setMessage(sentence);

    // Ensure we have time for exit animation; clamp if timeout is very small.
    const safeTimeout = Math.max(timeout, EXIT_MS + 50);
    const timeUntilExit = safeTimeout - EXIT_MS;
    timers.current.hide = window.setTimeout(() => setLeaving(true), timeUntilExit);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => clearTimers, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {message && (
        <div
          key={lastId.current}
          className={"toast" + (leaving ? " toast--leaving" : "")}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          onAnimationEnd={(e) => {
            if (leaving && e.animationName === "toastOut") {
              // Remove after exit animation completes
              setMessage(null);
              setLeaving(false);
            }
          }}
        >
          <div className="toast-message">{message}</div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}

export function ToastHost() {
  // rendered via provider above to keep DOM portal simple
  return null;
}