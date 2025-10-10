import React from "react";
import type { User } from "@/src/lib/types";

function maybeUrl(platform: string, val?: string): string | undefined {
  if (!val) return undefined;
  // If value looks like a full URL, use it as-is. Otherwise build a common URL.
  if (val.startsWith("http://") || val.startsWith("https://")) return val;
  const handle = val.replace(/^@/, "");
  switch (platform) {
    case "twitter": return `https://x.com/${handle}`;
    case "instagram": return `https://instagram.com/${handle}`;
    case "github": return `https://github.com/${handle}`;
    case "linkedin": return `https://www.linkedin.com/in/${handle}`;
    case "website": return handle.startsWith("http") ? handle : `https://${handle}`;
    default: return handle;
  }
}

export function ProfileSocialLinks({ user }: { user: User }) {
  const links = user.socialLinks || {};
  const items: { key: string; label: string; url?: string | undefined; svg: string }[] = [];

  if (links.twitter) items.push({ key: 'twitter', label: 'Twitter', url: maybeUrl('twitter', links.twitter), svg: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 5.9c-.7.3-1.4.5-2.2.6.8-.5 1.4-1.3 1.6-2.3-.8.5-1.7.8-2.6 1-1.5-1.6-4-1.4-5.4.4-1 1.4-.7 3 .7 3.8-.6 0-1.2-.2-1.7-.5-.4 1.4.5 2.9 2 3.2-.6.1-1.2.1-1.8 0 .5 1.5 2 2.3 3.6 2.3-1.6 1.3-3.5 2-5.4 2-.3 0-.7 0-1-.1 1.9 1.2 4.1 1.9 6.5 1.9 7.8 0 12.1-6.5 12.1-12.1v-.6c.8-.7 1.4-1.6 1.9-2.6-.8.4-1.6.6-2.5.7z"/></svg>' });
  if (links.instagram) items.push({ key: 'instagram', label: 'Instagram', url: maybeUrl('instagram', links.instagram), svg: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 6.2A4.8 4.8 0 1 0 16.8 13 4.8 4.8 0 0 0 12 8.2zm6.4-1.6a1.2 1.2 0 1 0 1.2 1.2 1.2 1.2 0 0 0-1.2-1.2z"/></svg>' });
  if (links.github) items.push({ key: 'github', label: 'GitHub', url: maybeUrl('github', links.github), svg: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.2.8-.6v-2.3c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.2-.8.1-.8.1-.8 1.3.1 2 1.3 2 1.3 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.3-3.1-.1-.3-.6-1.6.1-3.4 0 0 1-.3 3.4 1.2a11.7 11.7 0 0 1 6.2 0c2.4-1.5 3.4-1.2 3.4-1.2.7 1.8.2 3.1.1 3.4.8.8 1.3 1.9 1.3 3.1 0 4.5-2.7 5.5-5.3 5.8.4.3.8 1 .8 2v3c0 .4.2.7.8.6A12 12 0 0 0 12 .5z"/></svg>' });
  if (links.linkedin) items.push({ key: 'linkedin', label: 'LinkedIn', url: maybeUrl('linkedin', links.linkedin), svg: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.6h.1c.5-.9 1.7-1.6 3.5-1.6 3.8 0 4.5 2.5 4.5 5.8V21H17v-5.1c0-1.2 0-2.8-1.7-2.8-1.7 0-2 1.4-2 2.7V21H9z"/></svg>' });
  if (links.website) items.push({ key: 'website', label: 'Website', url: maybeUrl('website', links.website), svg: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 17.9V20h-2v-.1A7.9 7.9 0 0 1 4.1 13H6v-2H4.1A7.9 7.9 0 0 1 11 4.1V6h2V4.1A7.9 7.9 0 0 1 19.9 11H18v2h1.9A7.9 7.9 0 0 1 13 19.9z"/></svg>' });

  if (items.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }} aria-label="Social links">
      {items.map(it => (
        <a key={it.key} href={it.url} target="_blank" rel="noopener noreferrer" title={it.label} className="social-link" style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: 'var(--muted-bg)', color: 'var(--text)', textDecoration: 'none' }}>
          <span dangerouslySetInnerHTML={{ __html: it.svg }} style={{ width: 18, height: 18, display: 'inline-block' }} />
        </a>
      ))}
    </div>
  );
}

export default ProfileSocialLinks;
