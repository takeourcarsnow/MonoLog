import { NextResponse } from 'next/server';
import { withHandler } from '@/lib/api/withHandler';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { isFavoriteQuerySchema } from '@/lib/validation';

export const GET = withHandler({ method: 'GET', querySchema: isFavoriteQuerySchema, authRequired: true })(async (req, ctx: any) => {
  const { postId } = ctx.query;
  const actorId = ctx.user.id;
  const sb = getServiceSupabase();

  const { data: profile } = await sb.from('users').select('favorites').eq('id', actorId).limit(1).single();
  const favorites: string[] = (profile && profile.favorites) || [];
  const isFavorite = favorites.includes(postId);
  return NextResponse.json({ isFavorite });
});