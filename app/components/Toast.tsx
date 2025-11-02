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

// Default export kept for any legacy/default imports during HMR or third-party
// integrations. Provide the same no-op surface as the named exports.
const _default = {
  ToastProvider,
  useToast: () => ({ show: (_: unknown) => {} }),
  ToastHost,
};

export default _default;
