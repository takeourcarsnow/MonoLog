import Portal from "../Portal";

interface CameraModalProps {
  cameraOpen: boolean;
  setCameraOpen: (open: boolean) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  processing: boolean;
  onCapture: () => void;
}

export function CameraModal({
  cameraOpen,
  setCameraOpen,
  videoRef,
  streamRef,
  processing,
  onCapture
}: CameraModalProps) {
  return (
    cameraOpen ? (
      <Portal>
        <div
          role="dialog"
          aria-modal={true}
          style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, zIndex: 20, background: 'rgba(0,0,0,0.6)' }}
          onClick={() => {
            // close on overlay click
            try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch (_) {}
            streamRef.current = null;
            setCameraOpen(false);
          }}
        >
          <div style={{ width: '100%', maxWidth: 720, background: 'var(--bg)', borderRadius: 8, padding: 12 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: 6, background: '#000' }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn" onClick={onCapture} disabled={processing}>
                  {processing ? (
                    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M12 2a10 10 0 1 0 10 10" strokeOpacity={0.28} />
                          <path d="M12 2a10 10 0 0 0 0 20">
                            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
                          </path>
                        </g>
                      </svg>
                      <span>Processing…</span>
                    </span>
                  ) : 'Capture'}
                </button>
                <button className="btn ghost" onClick={() => {
                  try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch (_) {}
                  streamRef.current = null;
                  setCameraOpen(false);
                }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      </Portal>
    ) : null
  );
}