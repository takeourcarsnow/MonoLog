import Image from 'next/image';
import type { SpotifyMeta } from "./hooks/useSpotifyMeta";

interface SpotifySectionProps {
  showSpotify: boolean;
  spotifyLink?: string;
  spotifyMeta?: SpotifyMeta | null;
}

export const SpotifySection = ({ showSpotify, spotifyLink, spotifyMeta }: SpotifySectionProps) => {
  if (!spotifyLink) return null;

  return (
    <div className={`spotify-section ${showSpotify ? 'open' : ''}`}>
      <div className="spotify-info" style={{ marginTop: 8, fontSize: 14, color: 'var(--text)', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
        <div className="spotify-preview-content" style={{ position: 'relative', minHeight: 24 }}>
          <a
            href={spotifyLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`spotify-preview-link ${spotifyMeta ? 'visible' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit', justifyContent: 'center' }}
            aria-hidden={!spotifyMeta}
          >
            {spotifyMeta?.thumbnail_url ? (
              <Image
                src={spotifyMeta.thumbnail_url}
                alt={spotifyMeta.title ? `${spotifyMeta.title} album art` : 'Spotify album art'}
                width={36}
                height={36}
                style={{ display: 'block', objectFit: 'cover', borderRadius: '50%', width: 36, height: 36, flexShrink: 0 }}
              />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden style={{ display: 'block' }}>
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.6-.12-.421.18-.78.6-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.241 1.081zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.42-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.781-.18-.601.18-1.2.78-1.381 4.5-1.14 11.28-.86 15.72 1.621.479.3.599 1.02.3 1.5-.3.48-.84.599-1.32.3z" />
              </svg>
            )}
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{spotifyMeta?.author_name ? `${spotifyMeta.author_name} - ` : ''}{spotifyMeta?.title || 'Open on Spotify'}</span>
          </a>

          <div className={`spotify-loading ${spotifyMeta ? '' : 'visible'}`} aria-hidden={!!spotifyMeta} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden style={{ display: 'block' }}>
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.6-.12-.421.18-.78.6-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.241 1.081zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.42-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.781-.18-.601.18-1.2.78-1.381 4.5-1.14 11.28-.86 15.72 1.621.479.3.599 1.02.3 1.5-.3.48-.84.599-1.32.3z" />
            </svg>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>Loading Spotify info...</span>
          </div>
        </div>
      </div>
    </div>
  );
};