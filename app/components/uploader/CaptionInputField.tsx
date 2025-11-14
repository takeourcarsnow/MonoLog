import { useState, useRef, useEffect } from "react";
import { useTypingAnimation } from "./useTypingAnimation";
import { PHRASES } from "./constants";
import { Pen } from "lucide-react";

interface CaptionInputFieldProps {
  caption?: string;
  setCaption?: (caption: string) => void;
  hasPreview: boolean;
  processing: boolean;
  phrases?: string[];
}

export function CaptionInputField({
  caption,
  setCaption,
  hasPreview,
  processing,
  phrases = PHRASES,
}: CaptionInputFieldProps) {
  // Local buffered states to avoid tight parent re-render loops when typing fast.
  // We propagate changes to parent with a small debounce and always flush on blur.
  const [localCaption, setLocalCaption] = useState<string>(caption || "");
  const captionDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingCaptionRef = useRef(false);

  // Keep local state in sync if parent clears/loads draft etc.
  useEffect(() => {
    if (isTypingCaptionRef.current) return;
    setLocalCaption(caption || "");
  }, [caption]);

  const [captionFocused, setCaptionFocused] = useState(false);
  // Caption typing animation
  const { placeholder: captionPlaceholder, startIndex: captionStartIndex, setPlaceholder: setCaptionPlaceholder } = useTypingAnimation(localCaption, !hasPreview && !captionFocused, phrases);
  const [captionLocalIndex, setCaptionLocalIndex] = useState<number>(captionStartIndex >= 0 ? captionStartIndex : 0);

  // Rotate Caption placeholders
  useEffect(() => {
    if (localCaption || captionFocused || processing) return;
    // Typewriter: 2s type + 2s hold + 1.5s backspace = 5.5s
    const duration = 5500;
    const timer = setTimeout(() => {
      setCaptionLocalIndex((s) => {
        const next = (s + 1) % phrases.length;
        try { setCaptionPlaceholder(phrases[next]); } catch (_) {}
        return next;
      });
    }, duration + 100);
    return () => clearTimeout(timer);
  }, [localCaption, captionFocused, processing, captionPlaceholder, setCaptionPlaceholder, phrases]);

  const captionRef = useRef<HTMLTextAreaElement | null>(null);

  // Prevent ancestor touch/pointer handlers from stealing focus while
  // the user interacts with this input on mobile. Stop propagation
  // only so vertical scrolling still works as expected.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!captionFocused) return;

    const handler = (e: Event) => {
      try {
        const active = document.activeElement;
        if (active === captionRef.current) {
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

  // Debounce propagation of caption
  useEffect(() => {
    if (!isTypingCaptionRef.current) return;
    if (captionDebounceRef.current) clearTimeout(captionDebounceRef.current);
    captionDebounceRef.current = setTimeout(() => {
      try { setCaption?.(localCaption); } finally { isTypingCaptionRef.current = false; }
    }, 120);
    return () => {
      if (captionDebounceRef.current) clearTimeout(captionDebounceRef.current);
    };
  }, [localCaption, setCaption]);

  // Ensure height matches current caption on mount / changes
  useEffect(() => {
    try {
      const el = captionRef.current;
      if (!el) return;
      el.style.height = 'auto';
      // When the caption is empty we want the textarea to start compact.
      // Use a consistent default min height so it doesn't expand more than necessary
      // on mount due to scrollHeight quirks.
      const DEFAULT_MIN_HEIGHT = 40;
      const empty = !localCaption || localCaption.trim() === '';
      const newHeight = empty ? DEFAULT_MIN_HEIGHT : Math.min(Math.max(el.scrollHeight, DEFAULT_MIN_HEIGHT), 320);
      el.style.height = `${newHeight}px`;
    } catch (_) {}
  }, [localCaption]);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', marginTop: 8 }}>
      <div className="input-container" style={{ position: 'relative', width: '100%' }}>
        {(!localCaption && captionPlaceholder && !captionFocused) ? (
          <span className="input-ghost-placeholder multiline" aria-hidden="true">
            <span key={captionLocalIndex} className="typewriter">{captionPlaceholder}</span>
          </span>
        ) : null}
        <textarea
          className="input"
          aria-label="Caption"
          placeholder={localCaption ? undefined : ''}
          value={localCaption}
          onChange={e => {
            isTypingCaptionRef.current = true;
            setLocalCaption(e.target.value);
            try {
              const el = captionRef.current;
              if (el) {
                el.style.height = 'auto';
                const DEFAULT_MIN_HEIGHT = 40;
                const empty = !e.target.value || e.target.value.trim() === '';
                const newHeight = empty ? DEFAULT_MIN_HEIGHT : Math.min(Math.max(el.scrollHeight, DEFAULT_MIN_HEIGHT), 320);
                el.style.height = `${newHeight}px`;
              }
            } catch (_) {}
          }}
          readOnly={!hasPreview || processing}
          tabIndex={hasPreview ? 0 : -1}
          ref={captionRef}
          onMouseDown={(e) => { if (!hasPreview || processing) e.preventDefault(); }}
          onTouchStart={(e:any) => { e.stopPropagation(); }}
          onTouchMove={(e:any) => { e.stopPropagation(); }}
          onPointerDown={(e:any) => { e.stopPropagation(); }}
          onPointerMove={(e:any) => { e.stopPropagation(); }}
          onFocus={(e) => {
            if (!hasPreview || processing) {
              (e.target as HTMLTextAreaElement).blur();
              return;
            }
            setCaptionFocused(true);
          }}
          onBlur={() => {
            if (captionDebounceRef.current) { clearTimeout(captionDebounceRef.current); captionDebounceRef.current = null; }
            try { setCaption?.(localCaption); } finally { isTypingCaptionRef.current = false; }
            setCaptionFocused(false);
          }}
          style={{ width: '100%', paddingRight: 32, paddingLeft: 44, paddingTop: 8, paddingBottom: 8, minHeight: 40, maxHeight: 320, cursor: (!hasPreview || processing) ? 'not-allowed' : 'text', color: 'var(--text)', background: 'var(--bg)', resize: 'vertical' }}
        />
        <Pen size={16} className="input-icon" />
      </div>
    </div>
  );
}