import { useState, useRef, useEffect } from "react";
import { useTypingAnimation } from "./useTypingAnimation";

interface CaptionInputProps {
  caption: string;
  setCaption: (caption: string) => void;
  spotifyLink?: string;
  setSpotifyLink?: (link: string) => void;
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
  hasPreview,
  processing,
  CAPTION_MAX,
  toast
}: CaptionInputProps) {
  // keep typing animation local so its frequent updates don't re-render parent
  // Only run the animation when there's no preview and the caption input
  // itself is not focused. This prevents the typewriter from running while
  // the user is interacting with inputs elsewhere in the app.
  const { placeholder, typed } = useTypingAnimation(caption, !hasPreview && !captionFocused);
  const captionRemaining = Math.max(0, CAPTION_MAX - (caption?.length || 0));
  const inputRef = useRef<HTMLInputElement | null>(null);
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

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexDirection: 'column' }}>
      <style>{`
        .caption-counter { opacity: 0; transform: translateY(-50%) scale(0.98); }
        .caption-counter.visible { opacity: 1; transform: translateY(-50%) scale(1); }
        .caption-counter.near { color: #c47700; }
        .caption-counter.limit { color: #b91c1c; }
      `}</style>
      <div className="input-wrapper" style={{ flex: 1, position: 'relative', width: '100%' }}>
        {/** keep the ghost/typewriter visible even before a photo is selected,
         *  but prevent the input from being focused/edited until an image exists */}
        {(!caption && typed) ? (
          <span
            className="input-ghost-placeholder"
            aria-hidden="true"
            style={{ ['--len' as any]: String(typed.length), ['--steps' as any]: String(typed.length) }}
          >
            <span className="typewriter">{typed}</span>
            {/* caret removed per UX preference */}
          </span>
        ) : null}

        <input
          className="input"
          type="text"
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
          style={{ width: '100%', cursor: (!hasPreview || processing) ? 'not-allowed' : 'text', paddingRight: 72 }}
        />
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
        <input
          className="input"
          type="url"
          aria-label="Spotify link (optional)"
          placeholder="Optional Spotify link (paste a URL)"
          value={spotifyLink || ''}
          onChange={e => setSpotifyLink?.(e.target.value)}
          readOnly={!hasPreview || processing}
          tabIndex={hasPreview ? 0 : -1}
          ref={spotifyRef}
          onMouseDown={(e) => { if (!hasPreview || processing) e.preventDefault(); }}
          style={{ width: '100%', paddingRight: 72 }}
        />
      </div>
    </div>
  );
}
