import { NextResponse } from 'next/server';
import { withHandler } from '@/lib/api/withHandler';
import { createPostSchema } from './helpers';

export const POST = withHandler({ method: 'POST', bodySchema: createPostSchema, authRequired: true })(async (req, ctx: any) => {
  const { createPost } = await import('./helpers');
  return await createPost(req, ctx.body, ctx.user);
});
