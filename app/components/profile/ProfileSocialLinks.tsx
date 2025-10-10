import React from "react";
import { Twitter, Instagram, Github, Linkedin, Globe } from "lucide-react";
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
  const items: { key: string; label: string; url?: string | undefined; icon: React.ComponentType<any> }[] = [];

  if (links.twitter) items.push({ key: 'twitter', label: 'Twitter', url: maybeUrl('twitter', links.twitter), icon: Twitter });
  if (links.instagram) items.push({ key: 'instagram', label: 'Instagram', url: maybeUrl('instagram', links.instagram), icon: Instagram });
  if (links.github) items.push({ key: 'github', label: 'GitHub', url: maybeUrl('github', links.github), icon: Github });
  if (links.linkedin) items.push({ key: 'linkedin', label: 'LinkedIn', url: maybeUrl('linkedin', links.linkedin), icon: Linkedin });
  if (links.website) items.push({ key: 'website', label: 'Website', url: maybeUrl('website', links.website), icon: Globe });

  if (items.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }} aria-label="Social links">
      {items.map(it => {
        const IconComponent = it.icon;
        return (
          <a key={it.key} href={it.url} target="_blank" rel="noopener noreferrer" title={it.label} className="social-link" style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: 'var(--muted-bg)', color: 'var(--text)', textDecoration: 'none' }}>
            <IconComponent size={18} />
          </a>
        );
      })}
    </div>
  );
}

export default ProfileSocialLinks;
