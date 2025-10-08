"use client";

import Portal from "./Portal";
import { Button } from "./Button";
import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({ open, title, message, confirmLabel = "OK", cancelLabel = "Cancel", onConfirm, onCancel }: Props) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // Focus the primary action when opened for accessibility
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <Portal>
      <div className="auth-dialog-backdrop" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Confirm"}
        className="auth-dialog"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch", width: "100%" }}>
          {title ? <h3 style={{ margin: 0 }}>{title}</h3> : null}
          <div className="confirm-message">{message}</div>
          <div className="confirm-actions">
            <Button onClick={onCancel} aria-label={cancelLabel}>
              {cancelLabel}
            </Button>
            <Button
              ref={confirmRef as any}
              variant="danger"
              onClick={() => {
                onConfirm();
              }}
              aria-label={confirmLabel}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
