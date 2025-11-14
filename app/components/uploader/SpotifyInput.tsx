import { useState, useRef, useEffect } from "react";
import { useTypingAnimation } from "./useTypingAnimation";
import { PHRASES_SPOTIFY } from "./constants";
import { SpotifyIcon } from "./SpotifyIcon";

interface SpotifyInputProps {
  spotifyLink?: string;
  setSpotifyLink?: (link: string) => void;
  hasPreview: boolean;
  processing: boolean;
  phrases?: string[];
}

export function SpotifyInput({
  spotifyLink,
  setSpotifyLink,
  hasPreview,
  processing,
  phrases = PHRASES_SPOTIFY,
}: SpotifyInputProps) {
  // Local buffered states to avoid tight parent re-render loops when typing fast.
  // We propagate changes to parent with a small debounce and always flush on blur.
  const [localSpotify, setLocalSpotify] = useState<string>(spotifyLink || "");
  const spotifyDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingSpotifyRef = useRef(false);

  // Keep local state in sync if parent clears/loads draft etc.
  useEffect(() => {
    if (isTypingSpotifyRef.current) return;
    setLocalSpotify(spotifyLink || "");
  }, [spotifyLink]);

  const [spotifyFocused, setSpotifyFocused] = useState(false);
  // Spotify typing animation
  const { placeholder: spotifyPlaceholder, startIndex: spotifyStartIndex, setPlaceholder: setSpotifyPlaceholder } = useTypingAnimation(localSpotify, !hasPreview && !spotifyFocused, phrases);
  const [spotifyLocalIndex, setSpotifyLocalIndex] = useState<number>(spotifyStartIndex >= 0 ? spotifyStartIndex : 0);

  // Rotate Spotify placeholders
  useEffect(() => {
    if (localSpotify || spotifyFocused || processing) return;
    // Typewriter: 2s type + 2s hold + 1.5s backspace = 5.5s
    const duration = 5500;
    const timer = setTimeout(() => {
      setSpotifyLocalIndex((s) => {
        const next = (s + 1) % phrases.length;
        try { setSpotifyPlaceholder(phrases[next]); } catch (_) {}
        return next;
      });
    }, duration + 100);
    return () => clearTimeout(timer);
  }, [localSpotify, spotifyFocused, processing, spotifyPlaceholder, setSpotifyPlaceholder, phrases]);

  const spotifyRef = useRef<HTMLInputElement | null>(null);

  // Prevent ancestor touch/pointer handlers from stealing focus while
  // the user interacts with this input on mobile. Stop propagation
  // only so vertical scrolling still works as expected.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!spotifyFocused) return;

    const handler = (e: Event) => {
      try {
        const active = document.activeElement;
        if (active === spotifyRef.current) {
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
  }, [spotifyFocused]);

  // Debounce propagation of spotify link
  useEffect(() => {
    if (!isTypingSpotifyRef.current) return;
    if (spotifyDebounceRef.current) clearTimeout(spotifyDebounceRef.current);
    spotifyDebounceRef.current = setTimeout(() => {
      try { setSpotifyLink?.(localSpotify); } finally { isTypingSpotifyRef.current = false; }
    }, 120);
    return () => {
      if (spotifyDebounceRef.current) clearTimeout(spotifyDebounceRef.current);
    };
  }, [localSpotify, setSpotifyLink]);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', marginTop: 8 }}>
      <div className="input-container" style={{ position: 'relative', width: '100%' }}>
        {(!localSpotify && spotifyPlaceholder && !spotifyFocused) ? (
          <span
            className="input-ghost-placeholder"
            aria-hidden="true"
          >
            <span key={spotifyLocalIndex} className="typewriter">{spotifyPlaceholder}</span>
          </span>
        ) : null}
        <input
          className="input"
          /* Use text input but hint url inputmode to avoid some mobile browsers
             opening the native "URL" sheet or large suggestion panel when
             focusing a type=url field. Keep accessibility and behavior by
             disabling autocomplete/autocorrect which previously triggered
             large autofill UI on some Android builds. */
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          autoCapitalize="none"
          aria-label="Spotify link (optional)"
          placeholder={localSpotify ? undefined : ''}
          value={localSpotify}
          onChange={e => { isTypingSpotifyRef.current = true; setLocalSpotify(e.target.value); }}
          readOnly={!hasPreview || processing}
          tabIndex={hasPreview ? 0 : -1}
          ref={spotifyRef}
          onMouseDown={(e) => { if (!hasPreview || processing) e.preventDefault(); }}
            // Prevent parent touch/pointer handlers from stealing focus while
            // the user interacts with this input on mobile. Stop propagation
            // only so vertical scrolling still works as expected.
            onTouchStart={(e:any) => { e.stopPropagation(); }}
            onTouchMove={(e:any) => { e.stopPropagation(); }}
            onPointerDown={(e:any) => { e.stopPropagation(); }}
            onPointerMove={(e:any) => { e.stopPropagation(); }}
          onFocus={(e) => {
            if (!hasPreview || processing) {
              e.target.blur();
              return;
            }
            setSpotifyFocused(true);
          }}
          onBlur={() => {
            if (spotifyDebounceRef.current) { clearTimeout(spotifyDebounceRef.current); spotifyDebounceRef.current = null; }
            try { setSpotifyLink?.(localSpotify); } finally { isTypingSpotifyRef.current = false; }
            setSpotifyFocused(false);
          }}
          style={{ width: '100%', paddingRight: 32, paddingLeft: 44, cursor: (!hasPreview || processing) ? 'not-allowed' : 'text', color: 'var(--text)', background: 'var(--bg)' }}
        />
        <SpotifyIcon size={16} className={`input-icon ${localSpotify?.trim() && (localSpotify.includes('spotify.com') || localSpotify.includes('open.spotify.com')) ? 'spotify-filled' : ''}`} />
      </div>
    </div>
  );
}