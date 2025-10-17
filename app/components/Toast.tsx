"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastCtx = {
  show: (message: string, timeout?: number) => void;
};
const Ctx = createContext<ToastCtx>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  
  const show = useCallback((message: string, timeout = 3000) => {
    setMsg(message);
    setIsFadingOut(false);
    
    // Start fade-out animation before removing
    setTimeout(() => {
      setIsFadingOut(true);
      // Remove from DOM after animation completes
      setTimeout(() => setMsg(null), 300);
    }, timeout);
  }, []);
  
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
  return null;
}
