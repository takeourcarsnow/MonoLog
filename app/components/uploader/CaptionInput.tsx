import { useState, useRef, useEffect } from "react";
import { useTypingAnimation } from "./useTypingAnimation";
import { PHRASES } from "./constants";
import { Pen } from "lucide-react";
import { SpotifyIcon } from "./SpotifyIcon";
import { ExifInputs } from "./ExifInputs";

interface CaptionInputProps {
  caption: string;
  setCaption: (caption: string) => void;
  spotifyLink?: string;
  setSpotifyLink?: (link: string) => void;
  camera?: string;
  setCamera?: (camera: string) => void;
  lens?: string;
  setLens?: (lens: string) => void;
  filmType?: string;
  setFilmType?: (filmType: string) => void;
  filmIso?: string;
  setFilmIso?: (filmIso: string) => void;
  // typed removed - this component now owns the typing animation internally
  captionFocused: boolean;
  setCaptionFocused: (focused: boolean) => void;
  hasPreview: boolean;
  processing: boolean;
  CAPTION_MAX: number;
  toast: any; // from useToast
}

export function CaptionInput({
  caption,
  setCaption,
  captionFocused,
  setCaptionFocused,
  spotifyLink,
  setSpotifyLink,
  camera,
  setCamera,
  lens,
  setLens,
  filmType,
  setFilmType,
  filmIso,
  setFilmIso,
  hasPreview,
  processing,
  CAPTION_MAX,
  toast
}: CaptionInputProps) {
  // keep typing animation local (placeholder only). Render a CSS-only
  // typewriter animation using the placeholder string to avoid JS-driven
  // high-frequency updates which can affect focus.
  const { placeholder, startIndex, setPlaceholder } = useTypingAnimation(caption, !hasPreview && !captionFocused);
  const [localIndex, setLocalIndex] = useState<number>(startIndex >= 0 ? startIndex : 0);

  // Rotate the placeholder in-page while caption is empty and unfocused.
  // Schedule the next rotation after the CSS animation completes so the
  // text types, holds, and backspaces before the next one appears.
  useEffect(() => {
    // continue rotating placeholders while the caption is empty and the
    // input is not focused (preview presence shouldn't stop the ghost).
    if (caption || captionFocused || processing) return;
    // mirror the duration calculation used in the style (ms)
    const duration = Math.max(800, (placeholder?.length || 0) * 80 + 1200);
    const timer = setTimeout(() => {
      setLocalIndex((s) => {
        const next = (s + 1) % PHRASES.length;
        try { setPlaceholder(PHRASES[next]); } catch (_) {}
        return next;
      });
    }, duration + 200); // small buffer to ensure animation finished
    return () => clearTimeout(timer);
  }, [caption, captionFocused, processing, placeholder, setPlaceholder]);
  const captionRemaining = Math.max(0, CAPTION_MAX - (caption?.length || 0));
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const spotifyRef = useRef<HTMLInputElement | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Simplified focus management - prevent focus when not allowed
  // Removed complex overrides and event listeners to reduce DOM interference

  // Auto-resize textarea based on content (debounced to reduce lag on mobile)
  useEffect(() => {
    if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    resizeTimeoutRef.current = setTimeout(() => {
      const textarea = inputRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        const scrollH = textarea.scrollHeight;
        const minH = 48;
        const lineH = 21; // approx line-height * font-size
        const originalPadding = 12;
        if (scrollH <= minH) {
          textarea.style.height = minH + 'px';
          const paddingV = (minH - lineH) / 2;
          textarea.style.paddingTop = paddingV + 'px';
          textarea.style.paddingBottom = paddingV + 'px';
        } else {
          textarea.style.height = scrollH + 'px';
          textarea.style.paddingTop = originalPadding + 'px';
          textarea.style.paddingBottom = originalPadding + 'px';
        }
        // Avoid showing a vertical scrollbar when the content fits within
        // the computed height (e.g., single-line captions). Only allow
        // vertical scrolling when the content truly overflows.
        try {
          // Use clientHeight (actual layout height) rather than the style string
          // which can differ across browsers. Add a small tolerance to avoid
          // showing a scrollbar for negligible differences (1px gap).
          const currentH = textarea.clientHeight || parseInt(textarea.style.height || '0', 10) || 0;
          textarea.style.overflowY = scrollH > (currentH + 1) ? 'auto' : 'hidden';
        } catch (_) {
          // ignore and leave browser default if any issue
        }
      }
    }, 300); // 300ms debounce to prevent excessive DOM updates during typing
    return () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, [caption]);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexDirection: 'column' }}>
      <style>{`
        .caption-counter { opacity: 0; transform: translateY(-50%) scale(0.98); }
        .caption-counter.visible { opacity: 1; transform: translateY(-50%) scale(1); }
        .caption-counter.near { color: #c47700; }
        .caption-counter.limit { color: #b91c1c; }
        .input-ghost-placeholder { left: 32px !important; }
      `}</style>
      <div className="input-wrapper" style={{ flex: 1, position: 'relative', width: '100%' }}>
        {/** keep the ghost/typewriter visible even before a photo is selected,
         *  but prevent the input from being focused/edited until an image exists */}
        {/* CSS-driven typewriter ghost. Only show when caption is empty and
            the input is not focused (so it won't run while user types). */}
        {(!caption && placeholder && !captionFocused) ? (
          <span
            className="input-ghost-placeholder"
            aria-hidden="true"
            style={{ ['--len' as any]: String(placeholder.length), ['--duration' as any]: `${Math.max(800, placeholder.length * 80 + 1200)}ms` }}
          >
            {/* give the inner span a key tied to localIndex so React remounts it when
                the placeholder rotates — this restarts the CSS animation reliably */}
            <span key={localIndex} className="typewriter">{placeholder}</span>
            {/* caret removed per UX preference */}
          </span>
        ) : null}

        <textarea
          className="input"
          aria-label="Caption"
          placeholder={caption ? undefined : ''}
          value={caption}
          maxLength={CAPTION_MAX}
          ref={inputRef}
          onChange={e => {
            const v = e.target.value;
            if (v.length <= CAPTION_MAX) setCaption(v);
            else toast.show(`Captions are limited to ${CAPTION_MAX} characters`);
          }}
          readOnly={!hasPreview || processing}
          tabIndex={hasPreview ? 0 : -1}
          onMouseDown={(e) => {
            // Block mouse interaction when no image is selected so clicks don't focus the input
            if (!hasPreview || processing) e.preventDefault();
          }}
          onFocus={(e) => {
            if (!hasPreview || processing) {
              e.target.blur();
              return;
            }
            setCaptionFocused(true);
          }}
          onBlur={() => setCaptionFocused(false)}
          style={{ width: '100%', cursor: (!hasPreview || processing) ? 'not-allowed' : 'text', paddingRight: 72, paddingLeft: 32 }}
          rows={1}
        />
        <Pen size={16} className="input-icon" />
        {/* compact counter: only visible when input is focused; shows remaining when close to limit */}
        <div
          aria-hidden
          className={`caption-counter${captionFocused ? ' visible' : ''}${(CAPTION_MAX - (caption?.length || 0)) <= 0 ? ' limit' : ((CAPTION_MAX - (caption?.length || 0)) <= 10 ? ' near' : '')}`}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 11,
            color: 'var(--dim)',
            pointerEvents: 'none',
            padding: '4px 8px',
            borderRadius: 999,
            background: 'color-mix(in srgb, var(--bg-elev) 75%, transparent)',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            transition: 'opacity 160ms ease, transform 160ms ease'
          }}
        >
          {(() => {
            const len = caption?.length || 0;
            const remaining = CAPTION_MAX - len;
            const showRemaining = remaining <= 30; // threshold to switch to remaining-only
            return showRemaining ? String(remaining) : `${len}/${CAPTION_MAX}`;
          })()}
        </div>
      </div>
      {/* Spotify link input - optional */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', marginTop: 8 }}>
        <div className="input-container">
          <input
            className="input"
            type="url"
            aria-label="Spotify link (optional)"
            placeholder="Optional Spotify link"
            value={spotifyLink || ''}
            onChange={e => setSpotifyLink?.(e.target.value)}
            readOnly={!hasPreview || processing}
            tabIndex={hasPreview ? 0 : -1}
            ref={spotifyRef}
            onMouseDown={(e) => { if (!hasPreview || processing) e.preventDefault(); }}
            onFocus={(e) => {
              if (!hasPreview || processing) {
                e.target.blur();
                return;
              }
            }}
            style={{ width: '100%', paddingRight: 72, paddingLeft: 32, cursor: (!hasPreview || processing) ? 'not-allowed' : 'text' }}
          />
          <SpotifyIcon size={16} className={`input-icon ${spotifyLink?.trim() && (spotifyLink.includes('spotify.com') || spotifyLink.includes('open.spotify.com')) ? 'spotify-filled' : ''}`} />
        </div>
      </div>
      {/* EXIF inputs - optional */}
      <ExifInputs
        camera={camera}
        setCamera={setCamera}
        lens={lens}
        setLens={setLens}
        filmType={filmType}
        setFilmType={setFilmType}
        filmIso={filmIso}
        setFilmIso={setFilmIso}
        hasPreview={hasPreview}
        processing={processing}
      />
    </div>
  );
}


