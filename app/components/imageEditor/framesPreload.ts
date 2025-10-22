// Helper to preload frame thumbnails and share availability cache across
// the image editor. This lets the app start loading thumbnails as soon as the
// editor opens so the FramePanel can render them instantly.

let frameFiles: string[] = [];
let thumbAvailabilityCache: Record<string, boolean> | null = null;
let preloadStarted = false;

export function getThumbAvailabilityCache() {
  return thumbAvailabilityCache;
}

async function fetchFrameFiles(): Promise<string[]> {
  if (frameFiles.length > 0) return frameFiles;
  try {
    const response = await fetch('/api/frames');
    if (!response.ok) throw new Error('Failed to fetch frames');
    frameFiles = await response.json();
    return frameFiles;
  } catch (error) {
    console.error('Error fetching frame files:', error);
    frameFiles = [];
    return frameFiles;
  }
}

export async function getFrameFiles(): Promise<string[]> {
  return fetchFrameFiles();
}

export async function preloadFrameThumbnails() {
  if (preloadStarted && thumbAvailabilityCache) return thumbAvailabilityCache;
  preloadStarted = true;

  const files = await fetchFrameFiles();
  const result: Record<string, boolean> = {};
  await Promise.all(
    files.map((file) =>
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
        img.src = `/frames/${file}` + cacheBust; // No thumbs for frames, use full image
      })
    )
  );

  thumbAvailabilityCache = result;
  return result;
}