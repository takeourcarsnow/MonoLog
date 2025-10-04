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
      className="drop"
      ref={dropRef}
      tabIndex={0}
      role="button"
      aria-label="Drop an image or click to select"
      onClick={() => { if (!processing) onFileSelect(); }}
      onKeyDown={(e) => { if (!processing && (e.key === 'Enter' || e.key === ' ')) onFileSelect(); }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {processing && (
        <div className="drop-loader show-blur" role="status" aria-live="polite">
          <LogoLoader size={86} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>Processing image…</span>
        </div>
      )}
      <div className="drop-inner" style={{ opacity: processing ? 0.3 : 1, pointerEvents: processing ? 'none' : 'auto' }}>
        <div className="drop-icon" aria-hidden>+</div>
  <div className="drop-text">Drop images here or click to select</div>
  <div className="dim" style={{ marginTop: 6 }}>JPEG/PNG up to ~{CONFIG.imageMaxSizeMB}MB</div>
  <div className="dim" style={{ marginTop: 6 }}>You can add up to 5 photos per post</div>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button type="button" className="btn icon-reveal" onClick={(e) => { e.stopPropagation(); onFileSelect(); }} disabled={processing}>
            <span className="icon" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            <span className="reveal">Add files</span>
          </button>
          <button type="button" className="btn icon-reveal" onClick={(e) => {
            e.stopPropagation();
            onCameraSelect();
          }} disabled={processing}>
            <span className="icon" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7h3l2-2h6l2 2h3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
            <span className="reveal">Take photo</span>
          </button>
        </div>
      </div>
    </div>
  );
}