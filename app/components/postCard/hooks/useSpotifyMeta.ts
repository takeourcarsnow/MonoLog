import { useState, useEffect } from 'react';

export interface SpotifyMeta {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

// Simple in-memory cache keyed by spotifyLink to avoid duplicate network calls
const spotifyMetaCache = new Map<string, SpotifyMeta | null>();

// Accept an optional postId so the hook can observe the post element and
// only fetch metadata when the post is visible (or hovered/focused).
export const useSpotifyMeta = (spotifyLink?: string, postId?: string) => {
  const [spotifyMeta, setSpotifyMeta] = useState<SpotifyMeta | null>(() => {
    if (!spotifyLink) return null;
    return spotifyMetaCache.get(spotifyLink) || null;
  });

  useEffect(() => {
    if (!spotifyLink) return;

    let mounted = true;
    let obs: IntersectionObserver | null = null;

    // If already cached, we're done
    if (spotifyMetaCache.has(spotifyLink)) return;

    const doFetch = async () => {
      try {
        const apiUrl = `/api/spotify-meta?url=${encodeURIComponent(spotifyLink)}`;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error('spotify meta fetch failed');
        const json = await res.json();

        const meta = {
          title: json.title || undefined,
          author_name: json.author_name || undefined,
          thumbnail_url: json.thumbnail_url || undefined,
        } as SpotifyMeta;

        spotifyMetaCache.set(spotifyLink, meta);
        if (mounted) {
          setSpotifyMeta(meta);
          // Notify layout observers (image sizing) that the card structure changed
          setTimeout(() => {
            try { window.dispatchEvent(new CustomEvent('monolog:card_layout_change')); } catch (_) {}
          }, 0);
        }
      } catch (e) {
        // Cache a null to avoid retry storms
        spotifyMetaCache.set(spotifyLink, null);
        setTimeout(() => {
          try { window.dispatchEvent(new CustomEvent('monolog:card_layout_change')); } catch (_) {}
        }, 0);
      }
    };

    const el = postId ? document.getElementById(`post-${postId}`) : null;

    if (el && typeof IntersectionObserver !== 'undefined') {
      try {
        // Increase rootMargin so metadata is fetched before the post fully
        // enters the viewport (preload while the user scrolls nearby).
        obs = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              doFetch();
              if (obs) { obs.disconnect(); obs = null; }
            }
          });
        }, { rootMargin: '800px' });
        obs.observe(el);
      } catch (e) {
        // Fall back to waiting for hover/focus
      }

      const onEnter = () => {
        if (spotifyMetaCache.has(spotifyLink)) return;
        doFetch();
      };
      el.addEventListener('pointerenter', onEnter);
      el.addEventListener('focus', onEnter);

      return () => {
        mounted = false;
        try { el.removeEventListener('pointerenter', onEnter); el.removeEventListener('focus', onEnter); } catch (_) {}
        if (obs) obs.disconnect();
      };
    }

    // If no postId or no element found, fetch immediately as a last resort
    (async () => { await doFetch(); })();

    return () => { mounted = false; };
  }, [spotifyLink, postId]);

  return spotifyMeta;
};