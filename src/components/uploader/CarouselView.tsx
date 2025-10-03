interface CarouselViewProps {
  dataUrls: string[];
  alt: string | string[];
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  trackRef: React.RefObject<HTMLDivElement>;
  touchStartX: React.MutableRefObject<number | null>;
  touchDeltaX: React.MutableRefObject<number>;
  setEditingIndex: React.Dispatch<React.SetStateAction<number>>;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  fileActionRef: React.MutableRefObject<'append' | 'replace'>;
  replaceIndexRef: React.MutableRefObject<number | null>;
  setCameraOpen: React.Dispatch<React.SetStateAction<boolean>>;
  videoRef: React.RefObject<HTMLVideoElement>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  cameraInputRef: React.RefObject<HTMLInputElement>;
  toast: any;
}

export function CarouselView({
  dataUrls,
  alt,
  index,
  setIndex,
  trackRef,
  touchStartX,
  touchDeltaX,
  setEditingIndex,
  setEditing,
  fileActionRef,
  replaceIndexRef,
  setCameraOpen,
  videoRef,
  streamRef,
  cameraInputRef,
  toast
}: CarouselViewProps) {
  return (
    <div style={{ width: '100%' }}>
      <div className="carousel-wrapper" tabIndex={0} onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1));
        if (e.key === 'ArrowRight') setIndex(i => Math.min(dataUrls.length - 1, i + 1));
      }}>
        <div className="edge-area left" />
        <div className="edge-area right" />
        <div className="carousel-track" ref={trackRef} onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX; touchDeltaX.current = 0;
        }} onTouchMove={(e) => {
          if (touchStartX.current == null) return;
          touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
          if (trackRef.current) trackRef.current.style.transform = `translateX(calc(-${index * 100}% + ${touchDeltaX.current}px))`;
        }} onTouchEnd={() => {
          if (touchStartX.current == null) return;
          const delta = touchDeltaX.current; const threshold = 40;
          let target = index;
          if (delta > threshold) target = Math.max(0, index - 1);
          else if (delta < -threshold) target = Math.min(dataUrls.length - 1, index + 1);
          setIndex(target);
          if (trackRef.current) trackRef.current.style.transform = `translateX(-${target * 100}%)`;
          touchStartX.current = null; touchDeltaX.current = 0;
        }} role="list">
          {dataUrls.map((u, idx) => (
            <div className="carousel-slide" key={idx} role="listitem" aria-roledescription="slide" aria-label={`Preview ${idx+1} of ${dataUrls.length}`} style={{ position: 'relative' }}>
              <img alt={(Array.isArray(alt) ? (alt[idx] || '') : (alt || `Preview ${idx+1}`))} src={u} onLoad={() => {}} onError={() => {}} />
              <button
                className="btn"
                style={{ position: 'absolute', right: 8, bottom: 8 }}
                onClick={() => { setEditingIndex(idx); setEditing(true); setIndex(idx); }}
              >
                Edit
              </button>
              <button
                className="btn"
                style={{ position: 'absolute', right: 8, bottom: 56 }}
                onClick={() => {
                  // open camera to replace this image
                  fileActionRef.current = 'replace';
                  replaceIndexRef.current = idx;
                  // try getUserMedia first
                  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    (async () => {
                      setCameraOpen(true);
                      try {
                        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
                        streamRef.current = s;
                        if (videoRef.current) videoRef.current.srcObject = s;
                      } catch (e) {
                        console.error(e);
                        toast.show('Camera access denied or unavailable');
                        setCameraOpen(false);
                        try { fileActionRef.current = 'replace'; cameraInputRef.current?.click(); } catch (_) {}
                      }
                    })();
                  } else {
                    try { fileActionRef.current = 'replace'; cameraInputRef.current?.click(); } catch (_) {}
                  }
                }}
              >
                Capture
              </button>
            </div>
          ))}
        </div>

        <button className="carousel-arrow left" onClick={() => setIndex(i => Math.max(0, i - 1))} aria-label="Previous image">‹</button>
        <button className="carousel-arrow right" onClick={() => setIndex(i => Math.min(dataUrls.length - 1, i + 1))} aria-label="Next image">›</button>

        <div className="carousel-dots" aria-hidden="false">
          {dataUrls.map((_, i) => (
            <button key={i} className={`dot ${i === index ? 'active' : ''}`} onClick={() => setIndex(i)} aria-label={`Show preview ${i + 1}`} />
          ))}
        </div>
      </div>
    </div>
  );
}