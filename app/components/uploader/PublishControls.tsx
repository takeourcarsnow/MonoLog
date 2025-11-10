import { PublishButton } from "@/app/components/publish/PublishButton";
import { Trash } from "lucide-react";
import { Eye, EyeClosed } from "lucide-react";

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
  publishing: boolean;
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
  publishing,
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
          title={visibility === 'private' ? 'Make post public' : 'Make post private'}
        >
          <span className="vis-icon" aria-hidden>
            {visibility === 'private' ? (
              <EyeClosed size={18} />
            ) : (
              <Eye size={18} />
            )}
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
      publishing={publishing}
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
        title={confirmCancel ? 'Click again to discard draft' : 'Discard draft'}
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
