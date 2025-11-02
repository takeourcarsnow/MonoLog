"use client";

import Portal from "./Portal";
import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function InstallHelpModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
      <div className="auth-dialog-backdrop" style={{ backdropFilter: 'none', WebkitBackdropFilter: 'none', background: 'transparent' }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Installation Instructions"
        className="auth-dialog"
        style={{
          maxWidth: '500px',
          width: 'min(500px, calc(100% - 32px))',
          alignItems: 'stretch',
          justifyContent: 'flex-start',
          height: 'auto',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.06)'
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "stretch", width: "100%", padding: "16px" }}>
          <div style={{ fontSize: '14px', lineHeight: 1.5, color: 'var(--text)' }}>
            <p style={{ margin: '0 0 12px 0' }}>
              If you're having trouble with the automatic install prompt, try these manual installation steps:
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '8px', background: 'var(--bg-hover)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <strong>Chrome/Edge:</strong> Click the menu (⋮) → "Install MonoLog"
              </div>
              <div style={{ padding: '8px', background: 'var(--bg-hover)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <strong>Android Chrome:</strong> Tap the menu (⋮) → "Add to Home screen" → "Install"
              </div>
              <div style={{ padding: '8px', background: 'var(--bg-hover)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <strong>Firefox:</strong> Click the menu (☰) → "Install This Site as an App"
              </div>
              <div style={{ padding: '8px', background: 'var(--bg-hover)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <strong>Safari:</strong> Share button → "Add to Home Screen"
              </div>
            </div>
            
            <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: 'var(--muted)' }}>
              Or use your browser's install prompt when available.
            </p>
          </div>
        </div>
      </div>
    </Portal>
  );
}