import { NextResponse } from 'next/server';

export function apiError(message: string, status: number = 500, data?: any) {
  return NextResponse.json({ error: message, ...data }, { status });
}

export function apiSuccess(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}