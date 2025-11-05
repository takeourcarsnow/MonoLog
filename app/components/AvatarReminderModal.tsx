"use client";

import Portal from "@/app/components/ui/Portal";
import { Button } from "@/app/components/ui/Button";
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
      {/* No backdrop for this lightweight reminder - render only the dialog so the
          page background is not dimmed or blurred. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Avatar Reminder"
        className="auth-dialog avatar-reminder-dialog"
      >
        <div className="avatar-reminder-inner">
          <h3 className="avatar-reminder-title">Update Your Avatar</h3>
          <div className="confirm-message avatar-reminder-message">
            You&apos;re currently using the default avatar. Personalize your profile by uploading a custom one!
          </div>
          <div className="confirm-actions avatar-reminder-actions">
            <Button size="sm" onClick={onRemindLater} aria-label="Remind me later">
              Remind Me Later
            </Button>
            <Button
              size="sm"
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