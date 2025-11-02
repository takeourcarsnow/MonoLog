"use client";

// Toasts are no longer used in the application. Provide no-op exports to avoid
// touching all call sites while fully disabling any UI or side-effects.

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return children as any;
}

export function useToast() {
  return { show: (_: unknown) => {} } as const;
}

export function ToastHost() {
  return null;
}
