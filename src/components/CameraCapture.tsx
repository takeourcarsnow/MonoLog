import React, { useRef, useState, useEffect } from 'react';

type Props = {
  onCapture: (blob: Blob) => void;
  facingMode?: 'environment' | 'user';
  videoConstraints?: MediaTrackConstraints;
};

export default function CameraCapture({ onCapture, facingMode = 'environment', videoConstraints }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    setError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera API not supported in this browser.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: videoConstraints ?? { facingMode },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Mobile browsers sometimes need play called explicitly
        await videoRef.current.play();
      }
      setRunning(true);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    }
  }

  function stopCamera() {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (e) {
        // ignore
      }
    }
    setRunning(false);
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video) return;
    const width = video.videoWidth || video.clientWidth;
    const height = video.videoHeight || video.clientHeight;
    if (!width || !height) {
      setError('Unable to determine video size for capture.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Unable to capture frame.');
      return;
    }
    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) {
        setError('Failed to convert image to blob.');
        return;
      }
      onCapture(blob);
    }, 'image/jpeg', 0.92);
  }

  // Fallback file input change handler
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    onCapture(files[0]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {!running ? (
          <button onClick={startCamera} type="button">Open camera</button>
        ) : (
          <>
            <button onClick={captureFrame} type="button">Capture</button>
            <button onClick={stopCamera} type="button">Stop</button>
          </>
        )}

        {/* Fallback input: accept and capture hint for mobile browsers */}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
          <span style={{ fontSize: 12, opacity: 0.85 }}>Or use device picker</span>
        </label>
      </div>

      {error && <div style={{ color: 'red', fontSize: 13 }}>{error}</div>}

      <div style={{ position: 'relative', width: '100%', maxWidth: 480 }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: '100%', height: 'auto', borderRadius: 8, background: '#000' }}
        />
      </div>
    </div>
  );
}
