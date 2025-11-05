import { useState, useRef, useEffect } from "react";
import { useTypingAnimation } from "./useTypingAnimation";
import { PHRASES } from "./constants";
import { Pen } from "lucide-react";

interface CaptionTextareaProps {
  caption: string;
  setCaption: (caption: string) => void;
  captionFocused: boolean;
  setCaptionFocused: (focused: boolean) => void;
  hasPreview: boolean;
  processing: boolean;
  CAPTION_MAX: number;
}

export function CaptionTextarea({
  caption,
  setCaption,
  captionFocused,
  setCaptionFocused,
  hasPreview,
  processing,
  CAPTION_MAX,
}: CaptionTextareaProps) {
  // Local buffered states to avoid tight parent re-render loops when typing fast.
  // We propagate changes to parent with a small debounce and always flush on blur.
  const [localCaption, setLocalCaption] = useState<string>(caption || "");
  const captionDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingCaptionRef = useRef(false);

  // Keep local state in sync if parent clears/loads draft etc.
  useEffect(() => {
    if (isTypingCaptionRef.current) return; // skip while user is typing
    setLocalCaption(caption || "");
  }, [caption]);

  // keep typing animation local (placeholder only). Render a CSS-only
  // typewriter animation using the placeholder string to avoid JS-driven
  // high-frequency updates which can affect focus.
  const { placeholder, startIndex, setPlaceholder } = useTypingAnimation(localCaption, !hasPreview && !captionFocused, PHRASES);
  const [localIndex, setLocalIndex] = useState<number>(startIndex >= 0 ? startIndex : 0);

  // Rotate the placeholder in-page while caption is empty and unfocused.
  // Schedule the next rotation after the CSS animation completes so the
  // text types, holds, and backspaces before the next one appears.
  useEffect(() => {
    // continue rotating placeholders while the caption is empty and the
    // input is not focused (preview presence shouldn't stop the ghost).
    if (localCaption || captionFocused || processing) return;
    // Typewriter: 2s type + 2s hold + 1.5s backspace = 5.5s
    const duration = 5500;
    const timer = setTimeout(() => {
      setLocalIndex((s) => {
        const next = (s + 1) % PHRASES.length;
        try { setPlaceholder(PHRASES[next]); } catch (_) {}
        return next;
      });
    }, duration + 100);
    return () => clearTimeout(timer);
  }, [localCaption, captionFocused, processing, placeholder, setPlaceholder]);

  const captionRemaining = Math.max(0, CAPTION_MAX - (localCaption?.length || 0));
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent ancestor touch/pointer handlers (e.g., Swiper) from
  // blurring the active input while the user is interacting with it.
  // We add a capture-phase listener when the input is focused which
  // stops propagation of the initial touch/pointer events but does NOT
  // call preventDefault so native scrolling still works.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!captionFocused) return;

    const handler = (e: Event) => {
      try {
        // If the active element is our input, stop propagation so
        // higher-level listeners (like Swiper) don't run their focus-clearing logic.
        const active = document.activeElement;
        if (active === inputRef.current) {
          e.stopPropagation();
        }
      } catch (_) {
        // ignore
      }
    };

    document.addEventListener('touchstart', handler as EventListener, { capture: true } as any);
    document.addEventListener('pointerdown', handler as EventListener, { capture: true } as any);

    return () => {
      try { document.removeEventListener('touchstart', handler as EventListener, { capture: true } as any); } catch (_) {}
      try { document.removeEventListener('pointerdown', handler as EventListener, { capture: true } as any); } catch (_) {}
    };
  }, [captionFocused]);

  // Determine if counter should be visible: only when focused and has text
  const counterVisible = captionFocused && localCaption.trim();

  // Auto-resize textarea based on content (debounced to reduce lag on mobile)
  useEffect(() => {
    if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    resizeTimeoutRef.current = setTimeout(() => {
      const textarea = inputRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        const scrollH = textarea.scrollHeight;
        const minH = 32;
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
        // the computed height (e.g., single-line captions). Since the textarea
        // resizes to fit the content, scrolling is never needed.
        textarea.style.overflowY = 'hidden';
      }
    }, 300); // 300ms debounce to prevent excessive DOM updates during typing
    return () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, [localCaption]);

  // Debounce propagation of caption to parent to avoid nested update chains
  useEffect(() => {
    if (!isTypingCaptionRef.current) return;
    if (captionDebounceRef.current) clearTimeout(captionDebounceRef.current);
    captionDebounceRef.current = setTimeout(() => {
      try { setCaption(localCaption); } finally { isTypingCaptionRef.current = false; }
    }, 120);
    return () => {
      if (captionDebounceRef.current) clearTimeout(captionDebounceRef.current);
    };
  }, [localCaption, setCaption]);

  return (
    <div className="input-wrapper" style={{ flex: 1, position: 'relative', width: '100%' }}>
      <style>{`
        .caption-counter { opacity: 0; transform: translateY(-50%) scale(0.98); }
        .caption-counter.visible { opacity: 1; transform: translateY(-50%) scale(1); }
        .caption-counter.near { color: #c47700; }
        .caption-counter.limit { color: #b91c1c; }
        .input-ghost-placeholder { left: 32px !important; right: 32px !important; }
      `}</style>
      {/** keep the ghost/typewriter visible even before a photo is selected,
       *  but prevent the input from being focused/edited until an image exists */}
      {/* CSS-driven typewriter ghost. Only show when caption is empty and
          the input is not focused (so it won't run while user types). */}
      {(!localCaption && placeholder && !captionFocused) ? (
        <span
          className="input-ghost-placeholder"
          aria-hidden="true"
        >
          {/* give the inner span a key tied to localIndex so React remounts it when
              the placeholder rotates — this restarts the CSS animation reliably */}
          <span key={localIndex} className="typewriter">{placeholder}</span>
        </span>
      ) : null}

      <textarea
        className="input"
        aria-label="Caption"
        placeholder={localCaption ? undefined : ''}
        value={localCaption}
        maxLength={CAPTION_MAX}
        ref={inputRef}
        onChange={e => {
          const v = e.target.value;
          isTypingCaptionRef.current = true;
          if (v.length <= CAPTION_MAX) setLocalCaption(v);
          else console.warn(`Captions are limited to ${CAPTION_MAX} characters`);
        }}
        readOnly={!hasPreview || processing}
        tabIndex={hasPreview ? 0 : -1}
        onMouseDown={(e) => {
          // Block mouse interaction when no image is selected so clicks don't focus the input
          if (!hasPreview || processing) e.preventDefault();
        }}
        // Prevent parent touch/pointer handlers from stealing focus while
        // the user interacts with the input on mobile. We only stop
        // propagation (don't preventDefault) so the page can still scroll.
        onTouchStart={(e:any) => { e.stopPropagation(); }}
        onTouchMove={(e:any) => { e.stopPropagation(); }}
        onPointerDown={(e:any) => { e.stopPropagation(); }}
        onPointerMove={(e:any) => { e.stopPropagation(); }}
        onFocus={(e) => {
          if (!hasPreview || processing) {
            e.target.blur();
            return;
          }
          setCaptionFocused(true);
          e.target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        onBlur={() => {
          // Flush local changes immediately on blur
          if (captionDebounceRef.current) { clearTimeout(captionDebounceRef.current); captionDebounceRef.current = null; }
          try { setCaption(localCaption); } finally { isTypingCaptionRef.current = false; }
          setCaptionFocused(false);
        }}
        style={{ width: '100%', cursor: (!hasPreview || processing) ? 'not-allowed' : 'text', paddingRight: counterVisible ? 72 : 32, paddingLeft: 32 }}
        rows={1}
      />
      <Pen size={16} className="input-icon" />
      {/* compact counter: only visible when input is focused; shows remaining when close to limit */}
      <div
        aria-hidden
        className={`caption-counter${counterVisible ? ' visible' : ''}${(CAPTION_MAX - (caption?.length || 0)) <= 0 ? ' limit' : ((CAPTION_MAX - (caption?.length || 0)) <= 10 ? ' near' : '')}`}
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
          background: 'color-mix(in srgb, var(--bg-elev) 90%, transparent)',
          border: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          transition: 'opacity 160ms ease, transform 160ms ease'
        }}
      >
        {(() => {
          const len = localCaption?.length || 0;
          const remaining = CAPTION_MAX - len;
          const showRemaining = remaining <= 30; // threshold to switch to remaining-only
          return showRemaining ? String(remaining) : `${len}/${CAPTION_MAX}`;
        })()}
      </div>
    </div>
  );
}