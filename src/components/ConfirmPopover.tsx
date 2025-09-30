"use client";

import { useEffect, useState } from "react";
import Portal from "./Portal";

type Props = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmPopover({ open, anchorRef, message = 'Discard this draft? You will lose selected photos and caption.', confirmLabel = 'Discard', cancelLabel = 'Keep', onConfirm, onCancel }: Props) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!open) return setPos(null);
    const el = anchorRef?.current as HTMLElement | null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // position popover above the anchor, aligned to its right edge
    const left = Math.max(8, r.right - 260);
    const top = Math.max(8, r.top - 12 - 72); // slightly above
    setPos({ left, top });

    function onDoc(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      // if click is outside anchor and popover, cancel
      if (anchorRef?.current && anchorRef.current.contains(target)) return;
      const popup = document.getElementById('confirm-popover-root');
      if (popup && popup.contains(target)) return;
      onCancel();
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onCancel(); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open, anchorRef, onCancel]);

  if (!open || !pos) return null;

  return (
    <Portal>
      <div id="confirm-popover-root" style={{ position: 'fixed', left: pos.left, top: pos.top, zIndex: 30 }}>
        <div className="confirm-popover" role="dialog" aria-modal={false} aria-label="Confirm discard">
          <div className="confirm-popover-arrow" aria-hidden="true" />
          <div className="confirm-popover-body">
            <div className="confirm-message">{message}</div>
            <div className="confirm-actions">
              <button className="btn danger" onClick={onConfirm}>{confirmLabel}</button>
              <button className="btn ghost" onClick={onCancel}>{cancelLabel}</button>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .confirm-popover { background: var(--bg); border-radius: 8px; padding: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.5); max-width: 320px; }
        .confirm-popover-arrow { width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-bottom: 8px solid var(--bg); position: absolute; right: 18px; top: -8px; }
        .confirm-popover-body { padding: 8px 12px; }
        .confirm-message { color: var(--muted, #c9c9c9); margin-bottom: 8px; }
        .confirm-actions { display:flex; gap:8px; justify-content:flex-end; }
        .btn.danger { background: var(--danger, #f56767); color: white; padding: 8px 14px; border-radius: 18px; }
        .btn.ghost { padding: 8px 12px; border-radius: 18px; }
      `}</style>
    </Portal>
  );
}
