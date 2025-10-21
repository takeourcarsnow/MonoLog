// Helper to preload overlay thumbnails and share availability cache across
// the image editor. This lets the app start loading thumbnails as soon as the
// editor opens so the OverlaysPanel can render them instantly.

export const overlayFiles = [
  'overlay (1).jpg',
  'overlay (2).jpg',
  'overlay (5).jpg',
  'overlay (6).jpg',
  'overlay (7).jpg',
  'overlay (9).jpg',
  'overlay (10).jpg',
  'overlay (11).jpg',
  'overlay (12).jpg',
  'overlay (14).jpg',
  'overlay (15).jpg',
  'overlay (16).jpg',
  'overlay (17).jpg',
];

let thumbAvailabilityCache: Record<string, boolean> | null = null;
let preloadStarted = false;

export function getThumbAvailabilityCache() {
  return thumbAvailabilityCache;
}

export async function preloadOverlayThumbnails() {
  if (preloadStarted && thumbAvailabilityCache) return thumbAvailabilityCache;
  preloadStarted = true;

  const result: Record<string, boolean> = {};
  await Promise.all(
    overlayFiles.map((file) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          result[file] = true;
          resolve();
        };
        img.onerror = () => {
          result[file] = false;
          resolve();
        };
        const cacheBust = (process.env.NODE_ENV === 'development') ? `?v=${Date.now()}` : '';
        img.src = `/overlays/thumbs/${file}` + cacheBust;
      })
    )
  );

  thumbAvailabilityCache = result;
  return result;
}
