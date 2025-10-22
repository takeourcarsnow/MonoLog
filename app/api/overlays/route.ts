import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const overlaysDir = path.join(process.cwd(), 'public', 'overlays');
    const files = fs.readdirSync(overlaysDir).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
    return NextResponse.json(files);
  } catch (error) {
    console.error('Error reading overlays directory:', error);
    return NextResponse.json({ error: 'Failed to load overlays' }, { status: 500 });
  }
}