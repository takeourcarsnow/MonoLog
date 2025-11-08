import { CONFIG } from "@/lib/config";
import LogoLoader from "./LogoLoader";

interface DropZoneProps {
  processing: boolean;
  onCameraEffectsSelect: () => void;
  onFileSelect: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dropRef: React.RefObject<HTMLDivElement | null>;
}

export function DropZone({
  processing,
  onCameraEffectsSelect,
  onFileSelect,
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
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
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
          <h3 className="drop-zone-title">Add photos</h3>
          <p className="drop-zone-subtitle">Upload from device or take with camera</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <button
            type="button"
            className="drop-zone-file-button"
            aria-label="Upload file"
            onClick={() => { if (!processing) onFileSelect(); }}
            disabled={processing}
            title="Upload from device"
            style={{ position: 'relative' }}
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
        </div>

        <div className="drop-zone-meta">
        </div>
      </div>
    </div>
  );
}
