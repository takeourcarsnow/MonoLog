"use client";

import { useEffect } from "react";
import Portal from "./Portal";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({ open, title = 'Confirm', description = '', confirmLabel = 'OK', cancelLabel = 'Cancel', onConfirm, onCancel }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <Portal>
      <div role="dialog" aria-modal="true" className="confirm-backdrop" onClick={onCancel}>
        <div className="confirm" role="document" onClick={(e) => e.stopPropagation()}>
          <h3>{title}</h3>
          {description ? <p className="dim">{description}</p> : null}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn ghost" onClick={onCancel}>{cancelLabel}</button>
            <button className="btn primary" onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </div>
      </div>
      <style jsx>{`
        .confirm-backdrop {
          position: fixed; inset: 0; display:flex; align-items:center; justify-content:center; z-index: 20; background: color-mix(in srgb, var(--bg) 84%, rgba(0,0,0,0.36));
        }
        .confirm { background: var(--bg); padding: 16px; border-radius: 10px; width: 92%; max-width: 520px; box-shadow: 0 8px 24px rgba(0,0,0,0.48); }
        .confirm h3 { margin: 0 0 6px 0; }
        .confirm p.dim { margin: 0; }
      `}</style>
    </Portal>
  );
}
