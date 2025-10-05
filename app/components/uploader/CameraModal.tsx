import Portal from "../Portal";
import LogoLoader from "./LogoLoader";

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
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <LogoLoader size={20} />
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
