"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ToastCtx = {
  show: (message: string, timeout?: number) => void;
};
const Ctx = createContext<ToastCtx>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  
  const show = useCallback((m: string, timeout = 2000) => {
    // Normalize incoming message to sentence case so UI toasts look consistent
    const sentence = m && m.length > 0 ? m[0].toUpperCase() + m.slice(1) : m;
    setMsg(sentence);
    setIsFadingOut(false);
    
    // Start fade-out animation before removing
    window.setTimeout(() => {
      setIsFadingOut(true);
      // Remove from DOM after animation completes
      window.setTimeout(() => setMsg(null), 300);
    }, timeout);
  }, []);
  
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {msg && (
        <div 
          className={`toast ${isFadingOut ? 'toast-fadeout' : ''}`} 
          role="status" 
          aria-live="polite"
        >
          <div className="toast-message">{msg}</div>
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
