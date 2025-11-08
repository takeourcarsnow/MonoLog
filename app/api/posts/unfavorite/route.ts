import { NextResponse } from 'next/server';
import { withHandler } from '@/lib/api/withHandler';
import { getServiceSupabase } from '@/lib/api/serverSupabase';
import { favoritePostSchema } from '@/lib/validation';

export const POST = withHandler({ method: 'POST', bodySchema: favoritePostSchema, authRequired: true })(async (req, ctx: any) => {
  const { postId } = ctx.body;
  const actorId = ctx.user.id;
  const sb = getServiceSupabase();

  const { data: profile } = await sb.from('users').select('favorites').eq('id', actorId).limit(1).single();
  let current: string[] = (profile && profile.favorites) || [];
  current = current.filter((id: string) => id !== postId);
  const { error } = await sb.from('users').update({ favorites: current }).eq('id', actorId);
  if (error) return NextResponse.json({ error: error.message || error }, { status: 500 });
  return NextResponse.json({ ok: true });
});
