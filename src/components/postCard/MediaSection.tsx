import { memo, useEffect, useRef, useState } from "react";
import type { HydratedPost } from "@/lib/types";
import ImageZoom from "../ImageZoom";

interface MediaSectionProps {
  post: HydratedPost;
  isFavorite: boolean;
  toggleFavoriteWithAuth: () => void;
  showFavoriteFeedback: (action: 'adding' | 'removing') => void;
  favoriteOverlayState: 'adding' | 'removing' | null;
  pathname: string;
  allowCarouselTouch?: boolean;
}

export const MediaSection = memo(function MediaSection({
  post,
  isFavorite,
  toggleFavoriteWithAuth,
  showFavoriteFeedback,
  favoriteOverlayState,
  pathname,
  allowCarouselTouch,
}: MediaSectionProps) {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isZooming, setIsZooming] = useState(false);
  const isZoomingRef = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const draggingRef = useRef(false);
  const activeTouchPointers = useRef<Set<number>>(new Set());
  const pointerSupported = typeof window !== 'undefined' && (window as any).PointerEvent !== undefined;

  const imageUrls: string[] = (post as any).imageUrls || ((post as any).imageUrl ? [(post as any).imageUrl] : []);
  const alts: string[] = Array.isArray(post.alt) ? post.alt : [post.alt || ""];

  useEffect(() => {
    if (index >= imageUrls.length) setIndex(Math.max(0, imageUrls.length - 1));
  }, [imageUrls.length, index]);

  useEffect(() => { indexRef.current = index; }, [index]);

  useEffect(() => {
    if (!trackRef.current) return;
    if (isZoomingRef.current) return;
    trackRef.current.style.transform = `translateX(-${index * 100}%)`;
  }, [index]);

  const prev = () => setIndex(i => (i <= 0 ? 0 : i - 1));
  const next = () => setIndex(i => (i >= imageUrls.length - 1 ? imageUrls.length - 1 : i + 1));

  const onTouchStart = (e: React.TouchEvent) => {
    if (isZoomingRef.current) return;
    e.stopPropagation();
    try { e.nativeEvent?.stopImmediatePropagation?.(); } catch (_) {}
    for (let i = 0; i < e.touches.length; i++) {
      activeTouchPointers.current.add(e.touches[i].identifier as any as number);
    }
    if (activeTouchPointers.current.size >= 2) {
      finishPointerDrag();
      setIsZooming(true);
      isZoomingRef.current = true;
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_start')); } catch (_) {}
      return;
    }
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_start')); } catch (_) {}
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isZoomingRef.current) return;
    e.stopPropagation();
    try { e.nativeEvent?.stopImmediatePropagation?.(); } catch (_) {}
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    if (trackRef.current) trackRef.current.style.transform = `translateX(calc(-${index * 100}% + ${touchDeltaX.current}px))`;
  };

  const onTouchEnd = () => {
    try { activeTouchPointers.current.clear(); } catch (_) {}
    if (touchStartX.current == null) return;
    const delta = touchDeltaX.current;
    const threshold = 40;
    let target = index;
    if (delta > threshold) target = Math.max(0, index - 1);
    else if (delta < -threshold) target = Math.min(imageUrls.length - 1, index + 1);
    setIndex(target);
    if (trackRef.current) trackRef.current.style.transform = `translateX(-${target * 100}%)`;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_end')); } catch (_) {}
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (isZoomingRef.current) return;
    e.stopPropagation();
    try { e.nativeEvent?.stopImmediatePropagation?.(); } catch (_) {}
    if (e.button !== 0) return;
    if ((e as any).pointerType === 'touch') {
      try { activeTouchPointers.current.add((e as any).pointerId); } catch (_) {}
      if (activeTouchPointers.current.size >= 2) {
        finishPointerDrag();
        setIsZooming(true);
        isZoomingRef.current = true;
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:zoom_start')); } catch (_) {}
        return;
      }
    }
    touchStartX.current = e.clientX;
    touchDeltaX.current = 0;
    draggingRef.current = true;
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_start')); } catch (_) {}
    try { document.body.style.userSelect = 'none'; document.body.style.cursor = 'grabbing'; } catch (_) {}
    const el = trackRef.current as any;
    try { if (el && el.setPointerCapture) el.setPointerCapture(e.pointerId); } catch (_) {}
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if ((e as any).pointerType === 'touch' && activeTouchPointers.current.size >= 2) return;
    if (!draggingRef.current || touchStartX.current == null) return;
    e.preventDefault();
    touchDeltaX.current = e.clientX - touchStartX.current;
    if (trackRef.current) trackRef.current.style.transform = `translateX(calc(-${index * 100}% + ${touchDeltaX.current}px))`;
  };

  const finishPointerDrag = (clientX?: number) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (isZoomingRef.current) {
      try {
        if (trackRef.current) trackRef.current.style.transform = `translateX(-${index * 100}%)`;
      } catch (_) {}
      touchStartX.current = null;
      touchDeltaX.current = 0;
      try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch (_) {}
      try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_end')); } catch (_) {}
      return;
    }
    const delta = touchDeltaX.current;
    const threshold = 40;
    let target = index;
    if (delta > threshold) target = Math.max(0, index - 1);
    else if (delta < -threshold) target = Math.min(imageUrls.length - 1, index + 1);
    setIndex(target);
    if (trackRef.current) trackRef.current.style.transform = `translateX(-${target * 100}%)`;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch (_) {}
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('monolog:carousel_drag_end')); } catch (_) {}
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const el = trackRef.current as any;
    try { if (el && el.releasePointerCapture) el.releasePointerCapture(e.pointerId); } catch (_) {}
    if ((e as any).pointerType === 'touch') {
      try { activeTouchPointers.current.delete((e as any).pointerId); } catch (_) {}
    }
    finishPointerDrag();
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    const el = trackRef.current as any;
    try { if (el && el.releasePointerCapture) el.releasePointerCapture(e.pointerId); } catch (_) {}
    if ((e as any).pointerType === 'touch') {
      try { activeTouchPointers.current.delete((e as any).pointerId); } catch (_) {}
    }
    finishPointerDrag();
  };

  const handleDocMouseMove = (e: MouseEvent) => {
    if (!draggingRef.current || touchStartX.current == null) return;
    e.preventDefault();
    touchDeltaX.current = e.clientX - touchStartX.current;
    if (trackRef.current) trackRef.current.style.transform = `translateX(calc(-${index * 100}% + ${touchDeltaX.current}px))`;
  };

  const handleDocMouseUp = (e: MouseEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (isZoomingRef.current) {
      try {
        if (trackRef.current) trackRef.current.style.transform = `translateX(-${index * 100}%)`;
      } catch (_) {}
      touchStartX.current = null;
      touchDeltaX.current = 0;
      try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch (_) {}
      document.removeEventListener('mousemove', handleDocMouseMove);
      document.removeEventListener('mouseup', handleDocMouseUp);
      return;
    }
    const delta = touchDeltaX.current;
    const threshold = 40;
    let target = index;
    if (delta > threshold) target = Math.max(0, index - 1);
    else if (delta < -threshold) target = Math.min(imageUrls.length - 1, index + 1);
    setIndex(target);
    if (trackRef.current) trackRef.current.style.transform = `translateX(-${target * 100}%)`;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch (_) {}
    document.removeEventListener('mousemove', handleDocMouseMove);
    document.removeEventListener('mouseup', handleDocMouseUp);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (isZoomingRef.current) return;
    e.stopPropagation();
    try { e.nativeEvent?.stopImmediatePropagation?.(); } catch (_) {}
    if (e.button !== 0) return;
    touchStartX.current = e.clientX;
    touchDeltaX.current = 0;
    draggingRef.current = true;
    try { document.body.style.userSelect = 'none'; document.body.style.cursor = 'grabbing'; } catch (_) {}
    document.addEventListener('mousemove', handleDocMouseMove);
    document.addEventListener('mouseup', handleDocMouseUp);
  };

  useEffect(() => {
    return () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        try { document.body.style.userSelect = ''; document.body.style.cursor = ''; } catch (_) {}
        document.removeEventListener('mousemove', handleDocMouseMove);
        document.removeEventListener('mouseup', handleDocMouseUp);
      }
    };
  }, [index]);

  useEffect(() => {
    function onZoomStart() {
      finishPointerDrag();
      setIsZooming(true);
      isZoomingRef.current = true;
    }
    function onZoomEnd() {
      setIsZooming(false);
      isZoomingRef.current = false;
      try {
        if (trackRef.current) trackRef.current.style.transform = `translateX(-${indexRef.current * 100}%)`;
      } catch (_) {}
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('monolog:zoom_start', onZoomStart as EventListener);
      window.addEventListener('monolog:zoom_end', onZoomEnd as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('monolog:zoom_start', onZoomStart as EventListener);
        window.removeEventListener('monolog:zoom_end', onZoomEnd as EventListener);
      }
    };
  }, []);

  const carouselTouchProps = (pathname?.startsWith('/post/') && !allowCarouselTouch) ? {} : (
    pointerSupported
      ? { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
      : { onTouchStart, onTouchMove, onTouchEnd, onMouseDown }
  );

  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<any>(null);
  const dblClickDetectedRef = useRef(false);

  const handleMediaClick = (e: React.MouseEvent, postHref: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dblClickDetectedRef.current) return;
    const onListing = pathname === '/' || (pathname || '').startsWith('/feed') || (pathname || '').startsWith('/explore');
    if (onListing) return;
    clickCountRef.current += 1;
    if (clickCountRef.current === 1) {
      clickTimerRef.current = setTimeout(() => {
        if (!dblClickDetectedRef.current) {
          try { window.history.pushState(null, '', postHref); } catch (_) {}
        }
        clickCountRef.current = 0;
        dblClickDetectedRef.current = false;
      }, 280);
    }
  };

  const handleMediaDblClick = (e: React.MouseEvent, postHref: string) => {
    e.preventDefault();
    e.stopPropagation();
    dblClickDetectedRef.current = true;
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    clickCountRef.current = 0;
    const willAdd = !isFavorite;
    toggleFavoriteWithAuth();
    showFavoriteFeedback(willAdd ? 'adding' : 'removing');
    setTimeout(() => {
      dblClickDetectedRef.current = false;
    }, 400);
  };

  useEffect(() => () => { 
    if (clickTimerRef.current) { try { clearTimeout(clickTimerRef.current); } catch (_) {} }
  }, []);

  const postHref = `/post/${post.user.username || post.userId}-${post.id.slice(0,8)}`;

  return (
    <div className="card-media" style={{ position: 'relative' }}>
      {favoriteOverlayState && (
        <div className={`favorite-overlay ${favoriteOverlayState}`} aria-hidden="true">
          ★
        </div>
      )}
      {imageUrls.length > 1 ? (
        <div className="carousel-wrapper" onKeyDown={(e) => {
          if (e.key === "ArrowLeft") prev();
          if (e.key === "ArrowRight") next();
        }} tabIndex={0}>
          <div className="edge-area left" />
          <div className="edge-area right" />
          <div className="carousel-track" ref={trackRef} {...carouselTouchProps} role="list" style={{ touchAction: 'pan-y' }}>
            {imageUrls.map((u: string, idx: number) => (
              <div className="carousel-slide" key={idx} role="listitem" aria-roledescription="slide" aria-label={`${idx + 1} of ${imageUrls.length}`}>
                <a
                  href={postHref}
                  className="media-link"
                  draggable={false}
                  onClick={(e) => handleMediaClick(e, postHref)}
                  onDoubleClick={(e) => handleMediaDblClick(e, postHref)}
                  onDragStart={e => e.preventDefault()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleMediaClick(e as any, postHref); }}
                >
                  <ImageZoom
                    loading="lazy"
                    src={u}
                    alt={alts[idx] || `Photo ${idx + 1}`}
                    onDoubleTap={(x,y) => {
                      const willAdd = !isFavorite;
                      toggleFavoriteWithAuth();
                      showFavoriteFeedback(willAdd ? 'adding' : 'removing');
                    }}
                    onLoad={e => (e.currentTarget.classList.add("loaded"))}
                    onDragStart={e => e.preventDefault()}
                  />
                </a>
              </div>
            ))}
          </div>
          <button className="carousel-arrow left" onClick={prev} aria-label="Previous image">‹</button>
          <button className="carousel-arrow right" onClick={next} aria-label="Next image">›</button>
          <div className="carousel-dots" aria-hidden="false">
            {imageUrls.map((_, i) => (
              <button key={i} className={`dot ${i === index ? "active" : ""}`} onClick={() => setIndex(i)} aria-label={`Show image ${i + 1}`} />
            ))}
          </div>
        </div>
      ) : (
        <a
          href={postHref}
          className="media-link"
          draggable={false}
          onClick={(e) => handleMediaClick(e, postHref)}
          onDoubleClick={(e) => handleMediaDblClick(e, postHref)}
          onDragStart={e => e.preventDefault()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') handleMediaClick(e as any, postHref); }}
        >
          <ImageZoom
            loading="lazy"
            src={imageUrls[0]}
            onDoubleTap={(x,y) => {
              const willAdd = !isFavorite;
              toggleFavoriteWithAuth();
              showFavoriteFeedback(willAdd ? 'adding' : 'removing');
            }}
            alt={alts[0] || "Photo"}
            onLoad={e => (e.currentTarget.classList.add("loaded"))}
          />
        </a>
      )}
    </div>
  );
});