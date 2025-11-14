import { z } from 'zod';

export const emailSchema = z.string().email().trim();

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const signinSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

export const usernameParamsSchema = z.object({
  username: z.string().trim().min(1),
});

export const tagParamsSchema = z.object({
  tag: z.string().trim().min(1).toLowerCase(),
});

export const postsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  before: z.string().optional(),
});

export const commentsQuerySchema = z.object({
  postId: z.string().trim().min(1).optional(),
  storyId: z.string().trim().min(1).optional(),
}).refine(data => data.postId || data.storyId, {
  message: 'Either postId or storyId parameter is required',
});

export const threadsQuerySchema = z.object({
  id: z.string().optional(),
  slug: z.string().optional(),
  communityId: z.string().optional(),
}).refine(data => data.id || data.slug || data.communityId, {
  message: 'Either id, slug, or communityId parameter is required',
});

export const userUpdateSchema = z.object({
  username: z.string().optional(),
  user_name: z.string().optional(),
  displayName: z.string().optional(),
  display_name: z.string().optional(),
  avatarUrl: z.string().optional(),
  avatar_url: z.string().optional(),
  bio: z.string().optional(),
  socialLinks: z.any().optional(),
  social_links: z.any().optional(),
  exifPresets: z.object({
    cameras: z.array(z.string()).optional(),
    lenses: z.array(z.string()).optional(),
    filmTypes: z.array(z.string()).optional(),
    filmIsos: z.array(z.string()).optional(),
  }).optional(),
  exif_presets: z.object({
    cameras: z.array(z.string()).optional(),
    lenses: z.array(z.string()).optional(),
    filmTypes: z.array(z.string()).optional(),
    filmIsos: z.array(z.string()).optional(),
  }).optional(),
});