import { useState, useRef, useEffect } from "react";
import { useTypingAnimation } from "./useTypingAnimation";
import { PHRASES } from "./constants";
import { Combobox } from "../Combobox";
import { CAMERA_PRESETS, LENS_PRESETS, FILM_PRESETS, ISO_PRESETS } from "@/src/lib/exifPresets";
import { Camera, Settings, Image, Pen, Gauge } from "lucide-react";

// Custom Spotify icon component
const SpotifyIcon = ({ size = 16, className }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.6-.12-.421.18-.78.6-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.241 1.081zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.42-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.781-.18-.601.18-1.2.78-1.381 4.5-1.14 11.28-.86 15.72 1.621.479.3.599 1.02.3 1.5-.3.48-.84.599-1.32.3z"/>
  </svg>
);

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

  // Override programmatic focus to only work when allowed. This prevents
  // other code calling `.focus()` from stealing focus when the input
  // shouldn't be active.
  useEffect(() => {
    const restore: Array<() => void> = [];
    try {
      const inp = inputRef.current;
      if (inp) {
        const orig = (inp as any).focus;
        (inp as any).focus = function (...args: any[]) {
          if (hasPreview && !processing) return orig.apply(this, args);
          return undefined;
        };
        restore.push(() => { try { (inp as any).focus = orig; } catch (_) {} });
      }
    } catch (_) {}
    try {
      const sp = spotifyRef.current;
      if (sp) {
        const origSp = (sp as any).focus;
        (sp as any).focus = function (...args: any[]) {
          if (hasPreview && !processing) return origSp.apply(this, args);
          return undefined;
        };
        restore.push(() => { try { (sp as any).focus = origSp; } catch (_) {} });
      }
    } catch (_) {}
    // Also capture phase focusin to immediately blur if focus sneaks in
    const onFocusIn = (e: FocusEvent) => {
      try {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        if ((target === inputRef.current || target === spotifyRef.current) && (!hasPreview || processing)) {
          try { (target as HTMLElement).blur(); } catch (_) {}
        }
      } catch (_) {}
    };
    document.addEventListener('focusin', onFocusIn, true);
    return () => {
      try { document.removeEventListener('focusin', onFocusIn, true); } catch (_) {}
      for (const r of restore) r();
    };
  }, [hasPreview, processing]);

  // Auto-resize textarea based on content
  useEffect(() => {
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
    }
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
          onFocus={(e) => { setCaptionFocused(true); }}
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
            style={{ width: '100%', paddingRight: 72, paddingLeft: 32, cursor: (!hasPreview || processing) ? 'not-allowed' : 'text' }}
          />
          <SpotifyIcon size={16} className={`input-icon ${spotifyLink?.trim() && (spotifyLink.includes('spotify.com') || spotifyLink.includes('open.spotify.com')) ? 'spotify-filled' : ''}`} />
        </div>
      </div>
      {/* EXIF inputs - optional */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', marginTop: 8 }}>
        <Combobox
          value={camera || ''}
          onChange={setCamera || (() => {})}
          options={CAMERA_PRESETS}
          placeholder="Camera"
          disabled={!hasPreview || processing}
          icon={Camera}
        />
        <Combobox
          value={lens || ''}
          onChange={setLens || (() => {})}
          options={LENS_PRESETS}
          placeholder="Lens"
          disabled={!hasPreview || processing}
          icon={Settings}
        />
        <Combobox
          value={filmType || ''}
          onChange={(value) => {
            setFilmType?.(value);
            if (!value) setFilmIso?.(''); // Clear ISO when film is cleared
          }}
          options={FILM_PRESETS}
          placeholder="Film"
          disabled={!hasPreview || processing}
          icon={Image}
        />
        {filmType && (
          <Combobox
            value={filmIso || ''}
            onChange={setFilmIso || (() => {})}
            options={ISO_PRESETS}
            placeholder="ISO"
            disabled={!hasPreview || processing}
            icon={Gauge}
          />
        )}
      </div>
    </div>
  );
}
