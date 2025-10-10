import { useState, useEffect } from 'react';

export interface SpotifyMeta {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

export const useSpotifyMeta = (spotifyLink?: string) => {
  const [spotifyMeta, setSpotifyMeta] = useState<SpotifyMeta | null>(null);

  useEffect(() => {
    // fetch Spotify oEmbed metadata for nice display & embed
    let mounted = true;
    async function fetchOEmbed() {
      try {
        if (!spotifyLink) return;
        const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyLink)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('oembed failed');
        const json = await res.json();
        console.log('Spotify oEmbed response:', json);
        // we use title/author and thumbnail (album art) for display; ignore html/embed
        if (mounted) {
          let title = json.title || '';
          let author_name = json.author_name;
          let thumbnail_url = (json as any).thumbnail_url;
          // Parse title to separate song title and artist if in "Title - Artist" or "Title – Artist" format
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
                // Get access token
                const tokenRes = await fetch('/api/spotify-token');
                if (tokenRes.ok) {
                  const tokenData = await tokenRes.json();
                  const accessToken = tokenData.access_token;
                  // Fetch metadata
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
                    // Update thumbnail if not set
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

          setSpotifyMeta({ title, author_name, thumbnail_url } as any);
        }
      } catch (e) {
        // ignore failures - we'll fall back to a simple link
      }
    }
    fetchOEmbed();
    return () => { mounted = false; };
  }, [spotifyLink]);

  return spotifyMeta;
};