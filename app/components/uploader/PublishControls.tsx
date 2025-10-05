import { PublishButton } from "../PublishButton";

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
  return (
    <>
      {(hasPreview) && !editing ? (
        <div className="form-row">
          <label className="vis-label">
            <div>
              <button
                type="button"
                role="switch"
                aria-checked={visibility === 'private'}
                aria-label={visibility === 'private' ? 'Make post public' : 'Make post private'}
                className={`vis-toggle btn ${visibility === 'private' ? 'private' : 'public'}`}
                onClick={() => setVisibility(v => v === 'public' ? 'private' : 'public')}
              >
                <span className="vis-icon" aria-hidden>
                  {/* eye open */}
                  <svg className="eye-open" viewBox="0 0 24 24" width="18" height="18" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" />
                  </svg>
                  {/* eye closed / eye-off */}
                  <svg className="eye-closed" viewBox="0 0 24 24" width="18" height="18" fill="none" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19C5 19 1 12 1 12a20.16 20.16 0 0 1 5.06-5.94" stroke="currentColor" />
                    <path d="M1 1l22 22" stroke="currentColor" />
                  </svg>
                </span>
                <span style={{ marginLeft: 8 }}>{visibility === 'private' ? 'Private' : 'Public'}</span>
              </button>
            </div>
          </label>

          <div className="btn-group">
            {/* New PublishButton component with countdown */}
            <PublishButton
              canPost={canPost ?? false}
              remaining={remaining}
              remainingMs={remainingMs}
              countdownTotalMs={countdownTotalMs}
              processing={processing}
              disabled={compressedSize !== null && compressedSize > CONFIG.imageMaxSizeMB * 1024 * 1024}
              onPublish={onPublish}
            />
            {/* fallback removed: the button displays the remaining time itself */}
            <button
              type="button"
              className={`btn cancel-btn${confirmCancel ? ' confirm' : ''}`}
              onClick={() => {
                if (processing) return;
                // First tap: enter confirm state
                if (!confirmCancel) {
                  setConfirmCancel(true);
                  // auto-revert after 4s if no second tap
                  if (confirmCancelTimerRef.current) window.clearTimeout(confirmCancelTimerRef.current);
                  confirmCancelTimerRef.current = window.setTimeout(() => {
                    setConfirmCancel(false);
                    confirmCancelTimerRef.current = null;
                  }, 4000);
                  return;
                }
                // Second tap: discard
                if (confirmCancelTimerRef.current) {
                  window.clearTimeout(confirmCancelTimerRef.current);
                  confirmCancelTimerRef.current = null;
                }
                setConfirmCancel(false);
                resetDraft();
              }}
              disabled={processing}
              aria-pressed={confirmCancel}
              aria-label={confirmCancel ? 'Tap again to discard draft' : 'Cancel (double tap to discard)'}
            >
              <span className="cancel-inner">{confirmCancel ? 'Discard draft' : 'Cancel'}</span>
            </button>
          </div>
        </div>
      ) : null}

      <div aria-live="polite" className="sr-only status">
        {/* screen-reader updates for processing/errors */}
      </div>
      {/* Screen reader hint when in confirm state */}
      {confirmCancel ? (
        <div className="sr-only" role="status">Tap Cancel again to discard this draft.</div>
      ) : null}
    </>
  );
}
