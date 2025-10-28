"use client";

import Portal from "./Portal";
import { Button } from "./Button";
import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onChangeNow: () => void;
  onRemindLater: () => void;
};

export default function AvatarReminderModal({ open, onChangeNow, onRemindLater }: Props) {
  const changeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // Focus the primary action when opened for accessibility
    changeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRemindLater();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onRemindLater]);

  if (!open) return null;

  return (
    <Portal>
      <div className="auth-dialog-backdrop" onClick={onRemindLater} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Avatar Reminder"
        className="auth-dialog"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", width: "100%" }}>
          <h3 style={{ margin: 0, textAlign: "center" }}>Update Your Avatar</h3>
          <div className="confirm-message" style={{ textAlign: "center" }}>
            You&apos;re currently using the default avatar. Personalize your profile by uploading a custom one!
          </div>
          <div className="confirm-actions" style={{ justifyContent: "center !important" }}>
            <Button onClick={onRemindLater} aria-label="Remind me later">
              Remind Me Later
            </Button>
            <Button
              ref={changeRef as any}
              onClick={onChangeNow}
              aria-label="Change avatar now"
            >
              Change Now
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}