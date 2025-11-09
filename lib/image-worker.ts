// Image compression web worker
// This worker handles image compression to avoid blocking the main thread

// Export types for use in main thread
export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

// Compress image using Canvas API
async function compressImage(
  imageData: ImageData,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    format = 'jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    try {
      const canvas = new OffscreenCanvas(maxWidth, maxHeight);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Calculate dimensions maintaining aspect ratio
      let { width, height } = imageData;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Create ImageBitmap from ImageData
      createImageBitmap(imageData).then(bitmap => {
        ctx.drawImage(bitmap, 0, 0, width, height);

        const mimeType = `image/${format}`;
        canvas.convertToBlob({ quality, type: mimeType }).then(blob => {
          if (!blob) {
            throw new Error('Failed to compress image');
          }

          const originalSize = imageData.data.length;
          const compressedSize = blob.size;
          const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

          resolve({
            blob,
            originalSize,
            compressedSize,
            compressionRatio
          });
        }).catch(reject);
      }).catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

// Handle messages from main thread
self.addEventListener('message', async (event) => {
  const { id, imageData, options } = event.data;

  try {
    const result = await compressImage(imageData, options);
    self.postMessage({ id, success: true, result });
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Export for TypeScript
export {};