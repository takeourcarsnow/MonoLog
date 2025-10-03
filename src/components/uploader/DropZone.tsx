import { CONFIG } from "@/lib/config";

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
        <div className="drop-loader" role="status" aria-live="polite">
          <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden>
            <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2a10 10 0 1 0 10 10" strokeOpacity={0.28} />
              <path d="M12 2a10 10 0 0 0 0 20">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
              </path>
            </g>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Processing image…</span>
        </div>
      )}
      <div className="drop-inner" style={{ opacity: processing ? 0.3 : 1, pointerEvents: processing ? 'none' : 'auto' }}>
        <div className="drop-icon" aria-hidden>+</div>
        <div className="drop-text">Drop images here or click to select</div>
        <div className="dim" style={{ marginTop: 6 }}>JPEG/PNG up to ~{CONFIG.imageMaxSizeMB}MB</div>
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