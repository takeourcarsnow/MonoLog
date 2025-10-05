import { useState } from "react";

interface CaptionInputProps {
  caption: string;
  setCaption: (caption: string) => void;
  typed: string;
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
  typed,
  captionFocused,
  setCaptionFocused,
  hasPreview,
  processing,
  CAPTION_MAX,
  toast
}: CaptionInputProps) {
  const captionRemaining = Math.max(0, CAPTION_MAX - (caption?.length || 0));

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <style>{`
        .caption-counter { opacity: 0; transform: translateY(-50%) scale(0.98); }
        .caption-counter.visible { opacity: 1; transform: translateY(-50%) scale(1); }
        .caption-counter.near { color: #c47700; }
        .caption-counter.limit { color: #b91c1c; }
      `}</style>
      <div className="input-wrapper" style={{ flex: 1, position: 'relative' }}>
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
          onFocus={() => setCaptionFocused(true)}
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
    </div>
  );
}
