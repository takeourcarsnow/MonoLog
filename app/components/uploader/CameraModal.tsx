import React from "react";
import { Button } from "@/app/components/ui/Button";
import Portal from "@/app/components/ui/Portal";
import LogoLoader from "./LogoLoader";

interface CameraModalProps {
  cameraOpen: boolean;
  setCameraOpen: (open: boolean) => void;
  // video element may be null until mounted, so accept a nullable ref
  videoRef: React.RefObject<HTMLVideoElement | null>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  processing: boolean;
  onCapture: () => void;
  openCamera?: () => Promise<void>;
}

export function CameraModal({
  cameraOpen,
  setCameraOpen,
  videoRef,
  streamRef,
  processing,
  onCapture
  , openCamera
}: CameraModalProps) {
  // Add modal-blur class when camera is open
  React.useEffect(() => {
    if (cameraOpen) {
      document.body.classList.add('modal-blur');
    } else {
      document.body.classList.remove('modal-blur');
    }

    return () => {
      document.body.classList.remove('modal-blur');
    };
  }, [cameraOpen]);

  // When the modal is open, ensure the video element is attached to the
  // active MediaStream (streamRef). Sometimes getUserMedia is acquired
  // before the modal mounts and the videoRef isn't ready yet; this effect
  // makes sure the stream is connected once the modal and video element
  // have been rendered.
  React.useEffect(() => {
    if (!cameraOpen) return;
    const v = videoRef.current;
    const s = streamRef.current;
    if (v && s) {
      try {
        // Attach stream and attempt to play. video is muted to allow autoplay
        v.srcObject = s;
        // Ensure muted property set so autoplay isn't blocked
        try { v.muted = true; } catch (_) {}
        v.onloadedmetadata = () => { try { v.play(); } catch (_) {} };
      } catch (e) {
        console.warn('Failed to attach stream to video element', e);
      }
    }

    return () => {
      if (v) {
        v.onloadedmetadata = null;
      }
    };
  }, [cameraOpen, videoRef, streamRef]);

  // Local diagnostic state to show stream/video metrics and allow a manual retry
  const [diag, setDiag] = React.useState<string | null>(null);

  const tryAttachOrGetStream = async () => {
    const v = videoRef.current;
    let s = streamRef.current;
    const maxAttempts = 4;
    const baseDelay = 150; // ms
    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // If a stream is already present, attach immediately
        if (streamRef.current) {
          s = streamRef.current;
        }

        if (!s) {
          // Try asking parent to open camera first (preferred)
          if (typeof openCamera === 'function') {
            setDiag(`Requesting camera (attempt ${attempt}/${maxAttempts})...`);
            try {
              await openCamera();
            } catch (e) {
              console.warn('openCamera threw', e);
            }
            // wait a short time for parent to populate streamRef
            const start = Date.now();
            while (!streamRef.current && Date.now() - start < baseDelay * attempt) {
              // eslint-disable-next-line no-await-in-loop
              await new Promise((r) => setTimeout(r, 80));
            }
            s = streamRef.current;
          }
        }

        // If still no stream and this is the last attempt, try getUserMedia directly
        if (!s && attempt === maxAttempts && navigator?.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
          setDiag('Acquiring camera directly (final attempt)...');
          s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
          streamRef.current = s;
        }

        if (s) {
          try {
            v && (v.srcObject = s);
            try { if (v) v.muted = true; } catch (_) {}
            await v?.play().catch(e => console.warn('video.play failed', e));
            // allow metadata to populate
            await new Promise((res) => setTimeout(res, 120));
            setDiag(`attached stream (${s.getTracks().length} tracks) — ${v?.videoWidth || 0}x${v?.videoHeight || 0}`);
            return;
          } catch (e) {
            console.warn('attach attempt failed', e);
            // clear s so next loop iteration may try again
            s = null as any;
          }
        }

        // brief exponential backoff before next attempt
        await new Promise((res) => setTimeout(res, baseDelay * attempt));
      }

      // If we reach here no attempt succeeded
      setDiag('no stream available (tried multiple times)');
    } catch (e: any) {
      console.error('tryAttachOrGetStream failed', e);
      setDiag(`error: ${e?.name || e?.message || String(e)}`);
    }
  };

  // Attempt to attach stream or acquire one automatically when modal opens.
  React.useEffect(() => {
    if (!cameraOpen) return;
    // Fire-and-forget; tryAttachOrGetStream will update diagnostic state.
    tryAttachOrGetStream().catch(() => {});

    // Schedule one automatic retry after a short delay to avoid a visible
    // flicker caused by multiple near-simultaneous attach attempts.
    const t1 = setTimeout(() => { tryAttachOrGetStream().catch(() => {}); }, 400);

    return () => {
      clearTimeout(t1);
    };
  }, [cameraOpen]);

  return (
    cameraOpen ? (
      <Portal wrapperId="camera-root">
        <div
          role="dialog"
          aria-modal={true}
          style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, zIndex: 100000, background: 'rgba(0,0,0,0.6)' }}
          onClick={() => {
            // close on overlay click
            try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch (_) {}
            streamRef.current = null;
            setCameraOpen(false);
          }}
        >
          <div style={{ width: '100%', maxWidth: 720, background: 'var(--bg)', borderRadius: 8, padding: 12 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* camera UI header (diagnostics hidden in production) */}
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: 6, background: '#000', objectFit: 'cover', height: 240 }} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <Button onClick={onCapture} loading={processing}>
                  {processing ? (
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <LogoLoader size={20} variant="other" />
                      <span>Processing</span>
                    </span>
                  ) : 'Capture'}
                </Button>
                <Button variant="ghost" onClick={() => {
                  try { streamRef.current?.getTracks().forEach(t => t.stop()); } catch (_) {}
                  streamRef.current = null;
                  setCameraOpen(false);
                }}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      </Portal>
    ) : null
  );
}
