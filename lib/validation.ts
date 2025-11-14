import { RESERVED_ROUTES } from "./types";
import { z } from 'zod';

// Post field schemas
export const postFieldsSchema = z.object({
  caption: z.string().max(2000).optional(),
  alt: z.union([z.string(), z.array(z.string())]).optional(),
  public: z.boolean().optional(),
  camera: z.string().optional(),
  lens: z.string().optional(),
  filmType: z.string().optional(),
  spotifyLink: z.string().optional(),
  weatherCondition: z.string().optional(),
  weatherTemperature: z.number().optional(),
  locationAddress: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  thumbnailUrls: z.array(z.string()).optional(),
});

export const createPostSchema = z.object({
  ...postFieldsSchema.shape,
  weather: z.object({
    condition: z.string().optional(),
    temperature: z.number().optional(),
    location: z.string().optional(),
  }).optional(),
  location: z.object({
    address: z.string().optional(),
  }).optional(),
});

export const updatePostSchema = z.object({
  id: z.string(),
  patch: postFieldsSchema,
});

export const favoritePostSchema = z.object({
  postId: z.string(),
});

export const isFavoriteQuerySchema = z.object({
  postId: z.string(),
});

// Username validation
export const validateUsername = (username: string): string | null => {
  const uname = username.trim();
  if (!uname) return 'Username cannot be empty';

  if (RESERVED_ROUTES.includes(uname.toLowerCase())) {
    return 'This username is reserved. Please choose a different one.';
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(uname)) {
    return 'Username can only contain letters, numbers, hyphens, and underscores';
  }

  if (uname.length < 3 || uname.length > 30) {
    return 'Username must be between 3 and 30 characters';
  }

  return null;
};

// Social link helpers
export const looksLikeTwitter = (v?: string) => {
  if (!v) return false;
  const t = v.trim();
  return t.startsWith('@') || t.includes('twitter.com') || t.includes('x.com') || t.includes('t.co');
};

export const looksLikeInstagram = (v?: string) => {
  if (!v) return false;
  const t = v.trim();
  return t.startsWith('@') || t.includes('instagram.com') || t.includes('instagr.am');
};

export const looksLikeSpotify = (v?: string) => {
  if (!v) return false;
  const t = v.trim();
  if (t.includes('spotify.com')) return true;
  return /^[a-zA-Z0-9-]+$/.test(t);
};

export const looksLikeFacebook = (v?: string) => {
  if (!v) return false;
  const t = v.trim();
  return t.startsWith('@') || t.includes('facebook.com') || t.includes('fb.me');
};

export const looksLikeWebsite = (v?: string) => {
  if (!v) return false;
  const t = v.trim();
  return t.startsWith('http://') || t.startsWith('https://') || (/\./.test(t) && !/\s/.test(t));
};

export const shouldPrefixAt = (v: string) => {
  const t = (v || '').trim();
  if (!t) return false;
  if (t.startsWith('@')) return false;
  if (t.startsWith('http://') || t.startsWith('https://')) return false;
  if (t.includes('/') || t.includes('.')) return false;
  return true;
};

export const ensureAt = (v: string) => {
  const t = (v || '').trim();
  if (!t) return '';
  return shouldPrefixAt(t) ? `@${t}` : t;
};

// Profile normalization
export const normalizeDisplayName = (displayName: string) => {
  const trimmed = (displayName || '').trim();
  return trimmed === '' ? null : trimmed;
};

export const normalizeBio = (bio: string) => {
  return (bio || '').trim().slice(0, 200);
};

export const normalizeSocialLinks = (links: Record<string, string>) => {
  const normalized: Record<string, string> = {};
  Object.entries(links).forEach(([key, value]) => {
    if (value.trim()) normalized[key] = value.trim();
  });
  return Object.keys(normalized).length ? normalized : null;
};