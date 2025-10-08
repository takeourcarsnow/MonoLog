"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ToastVariant = 'info' | 'success' | 'error' | 'warn';
type ToastCtx = {
  show: (message: string, timeout?: number, variant?: ToastVariant) => void;
  showFriendly: (raw: string, opts?: { context?: 'signin' | 'signup' | 'generic' }) => void;
};
const Ctx = createContext<ToastCtx>({ show: () => {}, showFriendly: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; variant: ToastVariant } | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  
  const show = useCallback((m: string, timeout = 2000, variant: ToastVariant = 'info') => {
    // Normalize incoming message to sentence case so UI toasts look consistent
    const sentence = m && m.length > 0 ? m[0].toUpperCase() + m.slice(1) : m;
    setMsg({ text: sentence, variant });
    setIsFadingOut(false);

    // Start fade-out animation before removing
    window.setTimeout(() => {
      setIsFadingOut(true);
      // Remove from DOM after animation completes
      window.setTimeout(() => setMsg(null), 300);
    }, timeout);
  }, []);

  // Normalize raw server messages into friendly UI messages
  const normalizeMessage = useCallback((raw: string, context: 'signin' | 'signup' | 'generic' = 'generic') => {
    if (!raw) return 'Something went wrong';
    const s = String(raw).trim();
    const lower = s.toLowerCase();

    // Rate-limit / blocked messages — surface as-is but mark as error
    if (lower.includes('too many attempts') || lower.includes('rate limit') || lower.includes('temporarily blocked') || lower.includes('blocked')) {
      return { text: s, variant: 'error' as ToastVariant };
    }

    if (context === 'signin') {
      // avoid account existence leakage
      const signinLeakPatterns = [/user not found/i, /no user/i, /not found/i, /invalid login/i, /invalid credentials/i, /wrong password/i, /password.*incorrect/i, /cannot find user/i, /email not found/i];
      if (signinLeakPatterns.some(rx => rx.test(s))) return 'Invalid login credentials';
      // common network/auth errors
      if (lower.includes('network') || lower.includes('timeout') || lower.includes('failed to fetch')) return 'Network error. Please try again.';
      if (lower.includes('invalid') || lower.includes('unauthorized') || lower.includes('forbidden')) return 'Invalid login credentials';
    }

    if (context === 'signup') {
      if (lower.includes('already')) return 'That email or username is already in use.';
      if (lower.includes('password')) return 'Please choose a valid password.';
    }

    // fallback: title-case the message
    return s[0].toUpperCase() + s.slice(1);
  }, []);

  const showFriendly = useCallback((raw: string, opts?: { context?: 'signin' | 'signup' | 'generic' }) => {
    const normalized = normalizeMessage(raw, opts?.context ?? 'generic');
    // normalizeMessage may return a string or an object with variant
    if (typeof normalized === 'string') {
      show(normalized, 2600, opts?.context === 'signin' ? 'error' : 'info');
    } else {
      const { text, variant } = normalized as any;
      show(text, 2600, variant || 'info');
    }
  }, [normalizeMessage, show]);
  
  return (
    <Ctx.Provider value={{ show, showFriendly }}>
      {children}
      {msg && (
        <div
          className={`toast ${isFadingOut ? 'toast-fadeout' : ''} toast--${msg.variant}`}
          role="status"
          aria-live="polite"
        >
          <div className="toast-inner">
            <span className="toast-icon" aria-hidden>
              {msg.variant === 'success' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              )}
              {msg.variant === 'error' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0z"/></svg>
              )}
              {msg.variant === 'warn' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              )}
              {msg.variant === 'info' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              )}
            </span>
            <div className="toast-message">{msg.text}</div>
          </div>
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
