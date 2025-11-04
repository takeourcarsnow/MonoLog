import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiResponse';
import { createPost } from './helpers';

export async function POST(req: Request) {
  try {
    return await createPost(req);
  } catch (e: any) {
    return apiError(e?.message || String(e), 500);
  }
}
