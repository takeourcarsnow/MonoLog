import { CONFIG } from "@/src/lib/config";
import LogoLoader from "./LogoLoader";

interface DropZoneProps {
  processing: boolean;
  onCameraSelect: () => void;
  onFileSelect: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dropRef: React.RefObject<HTMLDivElement>;
}

export function DropZone({
  processing,
  onCameraSelect,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  dropRef
}: DropZoneProps) {
  return (
    <div className="drop-zone" ref={dropRef}>
      {processing && (
        <div className="drop-zone-loader" role="status" aria-live="polite">
          <LogoLoader size={86} variant="theme" />
        </div>
      )}

      <div className="drop-zone-content" style={{ opacity: processing ? 1 : 1, pointerEvents: processing ? 'none' : 'auto', filter: processing ? 'blur(1px)' : 'none' }}>
        <button
          type="button"
          className="drop-zone-camera-button"
          aria-label="Take photo with camera"
          onClick={() => { if (!processing) onCameraSelect(); }}
          disabled={processing}
        >
          <div className="drop-zone-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 7h3l2-2h6l2 2h3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>

        <div className="drop-zone-text">
          <h3 className="drop-zone-title">Take a photo</h3>
          <p className="drop-zone-subtitle">or select it from your device</p>
        </div>

        <button
          type="button"
          className="drop-zone-gallery-button"
          aria-label="Select photo from device"
          onClick={() => { if (!processing) onFileSelect(); }}
          disabled={processing}
        >
          <div className="drop-zone-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>

        <div className="drop-zone-meta">
        </div>
      </div>
    </div>
  );
}
