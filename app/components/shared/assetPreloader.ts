// Shared Asset Preloading
// Common preloading logic for frames, overlays, and other assets

import { getFrameFiles as getFrameFilesFromPreload } from '../imageEditor/framesPreload';
import { getOverlayFiles as getOverlayFilesFromPreload } from '../imageEditor/overlaysPreload';

export async function preloadFrames(): Promise<string[]> {
  return getFrameFilesFromPreload();
}

export async function preloadOverlays(): Promise<string[]> {
  return getOverlayFilesFromPreload();
}

// Combined preload function
export async function preloadAssets(): Promise<{
  frames: string[];
  overlays: string[];
}> {
  const [frames, overlays] = await Promise.all([
    preloadFrames(),
    preloadOverlays(),
  ]);

  return { frames, overlays };
}