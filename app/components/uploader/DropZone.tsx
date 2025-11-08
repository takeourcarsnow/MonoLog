import { CONFIG } from "@/lib/config";
import LogoLoader from "./LogoLoader";

interface DropZoneProps {
  processing: boolean;
  onCameraEffectsSelect: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dropRef: React.RefObject<HTMLDivElement | null>;
}

export function DropZone({
  processing,
  onCameraEffectsSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  dropRef
}: DropZoneProps) {
  return (
    <div className="drop-zone" ref={dropRef} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      {processing && (
        <div className="drop-zone-loader" role="status" aria-live="polite">
          <LogoLoader size={86} variant="other" />
        </div>
      )}

      <div className="drop-zone-content" style={{ opacity: processing ? 1 : 1, pointerEvents: processing ? 'none' : 'auto', filter: processing ? 'blur(1px)' : 'none' }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <button
            type="button"
            className="drop-zone-camera-button"
            aria-label="Take photo with effects"
            onClick={() => { if (!processing) onCameraEffectsSelect(); }}
            disabled={processing}
            title="Camera with real-time effects"
            style={{ position: 'relative' }}
          >
            <div className="drop-zone-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>
        </div>

        <div className="drop-zone-text">
          <h3 className="drop-zone-title">Take a photo</h3>
          <p className="drop-zone-subtitle">or select from your device</p>
        </div>

        <div className="drop-zone-meta">
        </div>
      </div>
    </div>
  );
}
