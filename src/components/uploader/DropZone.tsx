import { CONFIG } from "@/lib/config";
import LogoLoader from "./LogoLoader";

interface DropZoneProps {
  processing: boolean;
  onFileSelect: () => void;
  onCameraSelect: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  dropRef: React.RefObject<HTMLDivElement>;
}

export function DropZone({
  processing,
  onFileSelect,
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
      aria-label="Drop images here or click to select files"
      onClick={() => { if (!processing) onFileSelect(); }}
      onKeyDown={(e) => { if (!processing && (e.key === 'Enter' || e.key === ' ')) onFileSelect(); }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {processing && (
        <div className="drop-zone-loader" role="status" aria-live="polite">
          <LogoLoader size={86} />
          <span className="processing-text">Processing image…</span>
        </div>
      )}

      <div className="drop-zone-content" style={{ opacity: processing ? 0.3 : 1, pointerEvents: processing ? 'none' : 'auto' }}>
        <div className="drop-zone-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" fill="currentColor" opacity="0.8"/>
            <path d="M8.5 13.5L10.5 15.5L15.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div className="drop-zone-text">
          <h3 className="drop-zone-title">Drop your images</h3>
          <p className="drop-zone-subtitle">or click to browse</p>
        </div>

        <div className="drop-zone-meta">
          <span className="file-limits">
            JPEG/PNG up to ~{CONFIG.imageMaxSizeMB}MB
          </span>
          <span className="file-limits">
            Up to 5 photos per post
          </span>
        </div>

        <div className="drop-zone-actions">
          <button
            type="button"
            className="camera-btn"
            onClick={(e) => { e.stopPropagation(); onCameraSelect(); }}
            aria-label="Take photo with camera"
            disabled={processing}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 7h3l2-2h6l2 2h3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="camera-btn-text">Camera</span>
          </button>
        </div>
      </div>
    </div>
  );
}