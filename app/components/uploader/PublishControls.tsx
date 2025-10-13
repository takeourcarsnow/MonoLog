import { PublishButton } from "../PublishButton";
import { Trash } from "lucide-react";

interface PublishControlsProps {
  hasPreview: boolean;
  editing: boolean;
  visibility: "public" | "private";
  setVisibility: React.Dispatch<React.SetStateAction<"public" | "private">>;
  canPost: boolean | null;
  remaining: string;
  remainingMs: number | null;
  countdownTotalMs: number | null;
  processing: boolean;
  compressedSize: number | null;
  CONFIG: any;
  onPublish: () => void;
  confirmCancel: boolean;
  setConfirmCancel: (confirm: boolean) => void;
  confirmCancelTimerRef: React.MutableRefObject<number | null>;
  resetDraft: () => void;
}

export function PublishControls({
  hasPreview,
  editing,
  visibility,
  setVisibility,
  canPost,
  remaining,
  remainingMs,
  countdownTotalMs,
  processing,
  compressedSize,
  CONFIG,
  onPublish,
  confirmCancel,
  setConfirmCancel,
  confirmCancelTimerRef,
  resetDraft
}: PublishControlsProps) {
  const inCountdown = typeof remainingMs === 'number' && remainingMs > 0 && typeof countdownTotalMs === 'number' && countdownTotalMs > 0;
  return (
    <>
      {(hasPreview) && !editing ? (
  <div className={`form-row publish-controls-row ${inCountdown ? 'in-countdown' : ''}`}>
      {/* Visibility Toggle (hidden during countdown) */}
      {!inCountdown && (
        <button
          type="button"
          role="switch"
          aria-checked={visibility === 'private'}
          aria-label={visibility === 'private' ? 'Make post public' : 'Make post private'}
          className={`vis-toggle ${visibility === 'private' ? 'private' : 'public'}`}
          onClick={(e) => {
            e.stopPropagation();
            setVisibility(v => v === 'public' ? 'private' : 'public');
          }}
        >
          <span className="vis-icon" aria-hidden>
            <svg className="eye-open" viewBox="0 0 24 24" width="18" height="18" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" />
              <circle cx="12" cy="12" r="3" stroke="currentColor" />
            </svg>
            <svg className="eye-closed" viewBox="0 0 24 24" width="18" height="18" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a20.16 20.16 0 0 1 5.06-5.94" stroke="currentColor" />
              <path d="M1 1l22 22" stroke="currentColor" />
            </svg>
          </span>
          <span>{visibility === 'private' ? 'Private' : 'Public'}</span>
        </button>
      )}

    {/* Publish Button */}
    <PublishButton
      canPost={canPost ?? false}
      remaining={remaining}
      remainingMs={remainingMs}
      countdownTotalMs={countdownTotalMs}
      processing={processing}
      disabled={compressedSize !== null && compressedSize > CONFIG.imageMaxSizeMB * 1024 * 1024}
      onPublish={onPublish}
    />

    {/* Discard Button */}
    {!inCountdown && (
      <button
        type="button"
        className={`discard-btn ${confirmCancel ? 'confirm' : ''}`}
        onClick={() => {
          if (processing) return;
          if (!confirmCancel) {
            setConfirmCancel(true);
            if (confirmCancelTimerRef.current) window.clearTimeout(confirmCancelTimerRef.current);
            confirmCancelTimerRef.current = window.setTimeout(() => {
              setConfirmCancel(false);
              confirmCancelTimerRef.current = null;
            }, 4000);
            return;
          }
          if (confirmCancelTimerRef.current) {
            window.clearTimeout(confirmCancelTimerRef.current);
            confirmCancelTimerRef.current = null;
          }
          setConfirmCancel(false);
          resetDraft();
        }}
        disabled={processing}
        aria-label={confirmCancel ? 'Click again to discard draft' : 'Discard draft'}
      >
        <Trash size={16} aria-hidden="true" />
        {confirmCancel ? 'Confirm' : 'Discard'}
      </button>
    )}
  </div>
      ) : null}
    </>
  );
}
