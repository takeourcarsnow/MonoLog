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

    // If already cached, set it and we're done
    if (spotifyMetaCache.has(spotifyLink)) {
      const cached = spotifyMetaCache.get(spotifyLink);
      if (mounted) setSpotifyMeta(cached || null);
      return;
    }

    const doFetch = async () => {
      try {
        const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyLink)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('oembed failed');
        const json = await res.json();

        let title = json.title || '';
        let author_name = json.author_name;
        let thumbnail_url = (json as any).thumbnail_url;

        // Parse title to separate song title and artist if in "Title - Artist" format
        const separator = title.includes(' – ') ? ' – ' : title.includes(' - ') ? ' - ' : null;
        if (separator) {
          const parts = title.split(separator);
          if (parts.length >= 2) {
            title = parts[0].trim();
            author_name = author_name || parts.slice(1).join(separator).trim();
          }
        }

        // If still no author_name, try to fetch from Spotify API
        if (!author_name) {
          try {
            const spotifyUrlMatch = spotifyLink.match(/https:\/\/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
            if (spotifyUrlMatch) {
              const type = spotifyUrlMatch[1];
              const id = spotifyUrlMatch[2];
              const tokenRes = await fetch('/api/spotify-token');
              if (tokenRes.ok) {
                const tokenData = await tokenRes.json();
                const accessToken = tokenData.access_token;
                const apiUrl = `https://api.spotify.com/v1/${type}s/${id}`;
                const apiRes = await fetch(apiUrl, {
                  headers: { 'Authorization': `Bearer ${accessToken}` },
                });
                if (apiRes.ok) {
                  const apiData = await apiRes.json();
                  if (type === 'track' || type === 'album') {
                    author_name = apiData.artists?.map((a: any) => a.name).join(', ') || author_name;
                  } else if (type === 'playlist') {
                    author_name = apiData.owner?.display_name || author_name;
                  }
                  if (!thumbnail_url && apiData.images?.[0]?.url) {
                    thumbnail_url = apiData.images[0].url;
                  }
                }
              }
            }
          } catch (e) {
            // Ignore API fetch failures
          }
        }

        const meta = { title, author_name, thumbnail_url } as SpotifyMeta;
        spotifyMetaCache.set(spotifyLink, meta);
        if (mounted) setSpotifyMeta(meta);
      } catch (e) {
        // Cache a null to avoid retry storms
        spotifyMetaCache.set(spotifyLink, null);
        if (mounted) setSpotifyMeta(null);
      }
    };

    // Fetch immediately when spotifyLink is provided
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => { await doFetch(); })();

    return () => { mounted = false; };
  }, [spotifyLink]);

  return spotifyMeta;
};