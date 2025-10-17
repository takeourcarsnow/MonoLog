import React from "react";
import { Twitter, Instagram, Globe, Facebook } from "lucide-react";
import { SpotifyIcon } from "../uploader/SpotifyIcon";
import type { User } from "@/src/lib/types";

function maybeUrl(platform: string, val?: string): string | undefined {
  if (!val) return undefined;
  // If value looks like a full URL, use it as-is. Otherwise build a common URL.
  if (val.startsWith("http://") || val.startsWith("https://")) return val;
  const handle = val.replace(/^@/, "");
  switch (platform) {
    case "twitter": return `https://x.com/${handle}`;
    case "instagram": return `https://instagram.com/${handle}`;
    case "spotify": return `https://open.spotify.com/user/${handle}`;
    case "facebook": return `https://facebook.com/${handle}`;
    case "website": return handle.startsWith("http") ? handle : `https://${handle}`;
    default: return handle;
  }
}

export function ProfileSocialLinks({ user }: { user: User }) {
  const links = user.socialLinks || {};
  const items: { key: string; label: string; url?: string | undefined; icon: React.ComponentType<any> }[] = [];

  if (links.twitter) items.push({ key: 'twitter', label: 'Twitter', url: maybeUrl('twitter', links.twitter), icon: Twitter });
  if (links.instagram) items.push({ key: 'instagram', label: 'Instagram', url: maybeUrl('instagram', links.instagram), icon: Instagram });
  if (links.spotify) items.push({ key: 'spotify', label: 'Spotify', url: maybeUrl('spotify', links.spotify), icon: SpotifyIcon });
  if (links.facebook) items.push({ key: 'facebook', label: 'Facebook', url: maybeUrl('facebook', links.facebook), icon: Facebook });
  if (links.website) items.push({ key: 'website', label: 'Website', url: maybeUrl('website', links.website), icon: Globe });

  if (items.length === 0) return null;

  return (
    <>
      <style>{`
        .social-link:hover svg {
          color: var(--accent) !important;
        }
        .social-link:hover[data-platform="twitter"] svg {
          color: #1DA1F2 !important;
        }
        .social-link:hover[data-platform="instagram"] svg {
          color: #E4405F !important;
        }
        .social-link:hover[data-platform="spotify"] svg {
          color: #1DB954 !important;
        }
        .social-link:hover[data-platform="facebook"] svg {
          color: #1877F2 !important;
        }
        .social-link:hover[data-platform="website"] svg {
          color: var(--primary) !important;
        }
        .social-link:active {
          transform: scale(0.95);
        }
      `}</style>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }} aria-label="Social links">
        {items.map(it => {
          const IconComponent = it.icon;
          return (
            <a key={it.key} href={it.url} target="_blank" rel="noopener noreferrer" title={it.label} className="social-link" data-platform={it.key} style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: 'var(--muted-bg)', color: 'var(--text)', textDecoration: 'none', transition: 'all 0.2s ease', cursor: 'pointer' }}>
              <IconComponent size={18} />
            </a>
          );
        })}
      </div>
    </>
  );
}

export default ProfileSocialLinks;
