// Helper to preload overlay thumbnails and share availability cache across
// the image editor. This lets the app start loading thumbnails as soon as the
// editor opens so the OverlaysPanel can render them instantly.

let overlayFiles: string[] = [];
let thumbAvailabilityCache: Record<string, boolean> | null = null;
let preloadStarted = false;

export function getThumbAvailabilityCache() {
  return thumbAvailabilityCache;
}

async function fetchOverlayFiles(): Promise<string[]> {
  if (overlayFiles.length > 0) return overlayFiles;
  try {
    const response = await fetch('/api/overlays');
    if (!response.ok) throw new Error('Failed to fetch overlays');
    overlayFiles = await response.json();
    return overlayFiles;
  } catch (error) {
    console.error('Error fetching overlay files:', error);
    overlayFiles = [];
    return overlayFiles;
  }
}

export async function getOverlayFiles(): Promise<string[]> {
  return fetchOverlayFiles();
}

export async function preloadOverlayThumbnails() {
  if (preloadStarted && thumbAvailabilityCache) return thumbAvailabilityCache;
  preloadStarted = true;

  const files = await fetchOverlayFiles();
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
        img.src = `/overlays/thumbs/${file}` + cacheBust;
      })
    )
  );

  thumbAvailabilityCache = result;
  return result;
}
