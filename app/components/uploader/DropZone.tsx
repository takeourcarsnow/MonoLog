import { CONFIG } from "@/src/lib/config";
import LogoLoader from "./LogoLoader";

interface DropZoneProps {
  processing: boolean;
  onCameraSelect: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dropRef: React.RefObject<HTMLDivElement>;
}

export function DropZone({
  processing,
  onCameraSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  dropRef
}: DropZoneProps) {
  return (
    <div
      className="drop-zone"
      ref={dropRef}
      tabIndex={0}
      role="button"
      aria-label="Take photo with camera"
      onClick={() => { if (!processing) onCameraSelect(); }}
      onKeyDown={(e) => { if (!processing && (e.key === 'Enter' || e.key === ' ')) onCameraSelect(); }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {processing && (
        <div className="drop-zone-loader" role="status" aria-live="polite">
          <LogoLoader size={86} />
        </div>
      )}

      <div className="drop-zone-content" style={{ opacity: processing ? 1 : 1, pointerEvents: processing ? 'none' : 'auto', filter: processing ? 'blur(1px)' : 'none' }}>
        <div className="drop-zone-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M4 7h3l2-2h6l2 2h3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div className="drop-zone-text">
          <h3 className="drop-zone-title">Take a photo</h3>
          <p className="drop-zone-subtitle">or upload from your device</p>
        </div>

        <div className="drop-zone-meta">
        </div>
      </div>
    </div>
  );
}
