"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ToastCtx = {
  show: (message: string, timeout?: number) => void;
};
const Ctx = createContext<ToastCtx>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((m: string, timeout = 2000) => {
    // Normalize incoming message to sentence case so UI toasts look consistent
    const sentence = m && m.length > 0 ? m[0].toUpperCase() + m.slice(1) : m;
    setMsg(sentence);
    window.setTimeout(() => setMsg(null), timeout);
  }, []);
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {msg && (
        <div className="toast" role="status" aria-live="polite">
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