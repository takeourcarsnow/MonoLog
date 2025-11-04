import { useState, useRef, useEffect } from "react";
import { useTypingAnimation } from "./useTypingAnimation";
import { PHRASES, PHRASES_SPOTIFY } from "./constants";
import { Pen } from "lucide-react";
import { SpotifyIcon } from "./SpotifyIcon";
import { ExifInputs } from "./ExifInputs";
import { WeatherLocationInputs } from "./WeatherLocationInputs";
import type { User } from "@/src/lib/types";

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
  weatherCondition?: string;
  setWeatherCondition?: (condition: string) => void;
  weatherTemperature?: number;
  setWeatherTemperature?: (temperature: number | undefined) => void;
  weatherLocation?: string;
  setWeatherLocation?: (location: string) => void;
  locationLatitude?: number;
  setLocationLatitude?: (latitude: number | undefined) => void;
  locationLongitude?: number;
  setLocationLongitude?: (longitude: number | undefined) => void;
  locationAddress?: string;
  setLocationAddress?: (address: string) => void;
  // typed removed - this component now owns the typing animation internally
  captionFocused: boolean;
  setCaptionFocused: (focused: boolean) => void;
  hasPreview: boolean;
  processing: boolean;
  CAPTION_MAX: number;
  toast: any; // from useToast
  user?: User | null;
  setUser?: (user: User) => void;
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
  weatherCondition,
  setWeatherCondition,
  weatherTemperature,
  setWeatherTemperature,
  weatherLocation,
  setWeatherLocation,
  locationLatitude,
  setLocationLatitude,
  locationLongitude,
  setLocationLongitude,
  locationAddress,
  setLocationAddress,
  hasPreview,
  processing,
  CAPTION_MAX,
  toast,
  user,
  setUser
}: CaptionInputProps) {
  // Local buffered states to avoid tight parent re-render loops when typing fast.
  // We propagate changes to parent with a small debounce and always flush on blur.
  const [localCaption, setLocalCaption] = useState<string>(caption || "");
  const [localSpotify, setLocalSpotify] = useState<string>(spotifyLink || "");
  const captionDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const spotifyDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingCaptionRef = useRef(false);
  const isTypingSpotifyRef = useRef(false);

  // Keep local state in sync if parent clears/loads draft etc.
  useEffect(() => {
    if (isTypingCaptionRef.current) return; // skip while user is typing
    setLocalCaption(caption || "");
  }, [caption]);

  useEffect(() => {
    if (isTypingSpotifyRef.current) return;
    setLocalSpotify(spotifyLink || "");
  }, [spotifyLink]);
  // keep typing animation local (placeholder only). Render a CSS-only
  // typewriter animation using the placeholder string to avoid JS-driven
  // high-frequency updates which can affect focus.
  const { placeholder, startIndex, setPlaceholder } = useTypingAnimation(localCaption, !hasPreview && !captionFocused, PHRASES);
  const [localIndex, setLocalIndex] = useState<number>(startIndex >= 0 ? startIndex : 0);

  const [spotifyFocused, setSpotifyFocused] = useState(false);
  // Spotify typing animation
  const { placeholder: spotifyPlaceholder, startIndex: spotifyStartIndex, setPlaceholder: setSpotifyPlaceholder } = useTypingAnimation(localSpotify, !hasPreview && !spotifyFocused, PHRASES_SPOTIFY);
  const [spotifyLocalIndex, setSpotifyLocalIndex] = useState<number>(spotifyStartIndex >= 0 ? spotifyStartIndex : 0);

  // Rotate the placeholder in-page while caption is empty and unfocused.
  // Schedule the next rotation after the CSS animation completes so the
  // text types, holds, and backspaces before the next one appears.
  useEffect(() => {
    // continue rotating placeholders while the caption is empty and the
    // input is not focused (preview presence shouldn't stop the ghost).
    if (localCaption || captionFocused || processing) return;
    // Simple fade duration (ms)
    const duration = 3000;
    const timer = setTimeout(() => {
      setLocalIndex((s) => {
        const next = (s + 1) % PHRASES.length;
        try { setPlaceholder(PHRASES[next]); } catch (_) {}
        return next;
      });
    }, duration + 200); // small buffer to ensure animation finished
    return () => clearTimeout(timer);
  }, [localCaption, captionFocused, processing, placeholder, setPlaceholder]);

  // Rotate Spotify placeholders
  useEffect(() => {
    if (localSpotify || spotifyFocused || processing) return;
    const duration = 3000;
    const timer = setTimeout(() => {
      setSpotifyLocalIndex((s) => {
        const next = (s + 1) % PHRASES_SPOTIFY.length;
        try { setSpotifyPlaceholder(PHRASES_SPOTIFY[next]); } catch (_) {}
        return next;
      });
    }, duration + 200);
    return () => clearTimeout(timer);
  }, [localSpotify, spotifyFocused, processing, spotifyPlaceholder, setSpotifyPlaceholder]);
  const captionRemaining = Math.max(0, CAPTION_MAX - (localCaption?.length || 0));
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const spotifyRef = useRef<HTMLInputElement | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent ancestor touch/pointer handlers (e.g., Swiper) from
  // blurring the active input while the user is interacting with it.
  // We add a capture-phase listener when either input is focused which
  // stops propagation of the initial touch/pointer events but does NOT
  // call preventDefault so native scrolling still works.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!captionFocused && !spotifyFocused) return;

    const handler = (e: Event) => {
      try {
        // If the active element is one of our inputs, stop propagation so
        // higher-level listeners (like Swiper) don't run their focus-clearing logic.
        const active = document.activeElement;
        if (active === inputRef.current || active === spotifyRef.current) {
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
  }, [captionFocused, spotifyFocused]);

  // Determine if counter should be visible: only when focused and has text
  const counterVisible = captionFocused && localCaption.trim();

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
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexDirection: 'column' }}>
      <style>{`
        .caption-counter { opacity: 0; transform: translateY(-50%) scale(0.98); }
        .caption-counter.visible { opacity: 1; transform: translateY(-50%) scale(1); }
        .caption-counter.near { color: #c47700; }
        .caption-counter.limit { color: #b91c1c; }
        .input-ghost-placeholder { left: 32px !important; right: 32px !important; }
      `}</style>
      <div className="input-wrapper" style={{ flex: 1, position: 'relative', width: '100%' }}>
        {/** keep the ghost/typewriter visible even before a photo is selected,
         *  but prevent the input from being focused/edited until an image exists */}
        {/* CSS-driven typewriter ghost. Only show when caption is empty and
            the input is not focused (so it won't run while user types). */}
        {(!localCaption && placeholder && !captionFocused) ? (
          <span
            className="input-ghost-placeholder"
            aria-hidden="true"
            style={{ ['--duration' as any]: `3000ms` }}
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
            background: 'color-mix(in srgb, var(--bg-elev) 75%, transparent)',
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
      {/* Spotify link input - optional */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', marginTop: 8 }}>
        <div className="input-container" style={{ position: 'relative', width: '100%' }}>
          {(!localSpotify && spotifyPlaceholder && !spotifyFocused) ? (
            <span
              className="input-ghost-placeholder"
              aria-hidden="true"
              style={{ ['--duration' as any]: `3000ms` }}
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
              e.target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            onBlur={() => {
              if (spotifyDebounceRef.current) { clearTimeout(spotifyDebounceRef.current); spotifyDebounceRef.current = null; }
              try { setSpotifyLink?.(localSpotify); } finally { isTypingSpotifyRef.current = false; }
              setSpotifyFocused(false);
            }}
            style={{ width: '100%', paddingRight: 72, paddingLeft: 32, cursor: (!hasPreview || processing) ? 'not-allowed' : 'text', color: 'var(--text)', background: 'var(--bg)' }}
          />
          <SpotifyIcon size={16} className={`input-icon ${localSpotify?.trim() && (localSpotify.includes('spotify.com') || localSpotify.includes('open.spotify.com')) ? 'spotify-filled' : ''}`} />
        </div>
      </div>
      {/* Weather and location inputs - optional */}
      <WeatherLocationInputs
        weatherCondition={weatherCondition}
        setWeatherCondition={setWeatherCondition}
        weatherTemperature={weatherTemperature}
        setWeatherTemperature={setWeatherTemperature}
        weatherLocation={weatherLocation}
        setWeatherLocation={setWeatherLocation}
        locationLatitude={locationLatitude}
        setLocationLatitude={setLocationLatitude}
        locationLongitude={locationLongitude}
        setLocationLongitude={setLocationLongitude}
        locationAddress={locationAddress}
        setLocationAddress={setLocationAddress}
        hasPreview={hasPreview}
        processing={processing}
      />
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
        user={user}
        setUser={setUser}
      />
    </div>
  );
}


