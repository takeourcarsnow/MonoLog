import { NextResponse } from 'next/server';
import { apiSuccess } from '@/lib/apiResponse';
import { withHandler } from '@/lib/api/withHandler';
import { usernameParamsSchema } from '@/lib/api/schemas';
import { getUserById, getUserByUsername } from '@/lib/api/queries';

function looksLikeUuid(s: string) {
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(s);
}

export const GET = withHandler({ method: 'GET', paramsSchema: usernameParamsSchema })(async (req, ctx) => {
  const { username: identifier } = ctx?.params as any;

  const user = looksLikeUuid(identifier) ? await getUserById(identifier) : await getUserByUsername(identifier);

  const response = apiSuccess({ user });
  response.headers.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  return response;
});