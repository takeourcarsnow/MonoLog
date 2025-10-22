import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const framesDir = path.join(process.cwd(), 'public', 'frames');
    const files = fs.readdirSync(framesDir).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
    return NextResponse.json(files);
  } catch (error) {
    console.error('Error reading frames directory:', error);
    return NextResponse.json({ error: 'Failed to load frames' }, { status: 500 });
  }
}