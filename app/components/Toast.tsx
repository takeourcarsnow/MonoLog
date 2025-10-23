"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from 'next/navigation';

type ShowOpts = {
  message: string;
  href?: string;
  onClick?: () => void | Promise<void>;
  timeout?: number;
};

type ToastCtx = {
  show: (messageOrOpts: string | ShowOpts) => void;
};
const Ctx = createContext<ToastCtx>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [pendingOnClick, setPendingOnClick] = useState<(() => void | Promise<void>) | null>(null);
  
  const clear = useCallback(() => {
    setMsg(null);
    setPendingHref(null);
    setPendingOnClick(null);
    setIsFadingOut(false);
  }, []);

  const show = useCallback((messageOrOpts: string | ShowOpts) => {
    let message: string;
    let href: string | undefined = undefined;
    let onClick: (() => void | Promise<void>) | undefined = undefined;
    let timeout = 3000;

    if (typeof messageOrOpts === 'string') {
      message = messageOrOpts;
    } else {
      message = messageOrOpts.message;
      href = messageOrOpts.href;
      onClick = messageOrOpts.onClick;
      if (typeof messageOrOpts.timeout === 'number') timeout = messageOrOpts.timeout;
    }

    setMsg(message);
    setPendingHref(href || null);
    setPendingOnClick(onClick || null);
    setIsFadingOut(false);

    // Start fade-out animation before removing
    setTimeout(() => {
      setIsFadingOut(true);
      // Remove from DOM after animation completes
      setTimeout(() => clear(), 300);
    }, timeout);
  }, [clear]);
  
  // Expose toast function to window for console testing in development
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).showToast = show;
  }
  
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {msg && (
        <div
          className={`toast ${isFadingOut ? 'fade-out' : ''}`}
          role="status"
          aria-live="polite"
        >
          <button
            type="button"
            className="toast-button"
            onClick={async () => {
              try {
                if (pendingOnClick) {
                  await pendingOnClick();
                } else if (pendingHref) {
                  // Prefer SPA navigation
                  try {
                    router.push(pendingHref);
                  } catch (e) {
                    // fallback to full navigation
                    window.location.href = pendingHref;
                  }
                }
              } catch (e) {
                // ignore click handler errors
              }
            }}
          >
            <div className="toast-message">{msg}</div>
          </button>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}

export function ToastHost() {
  return null;
}
