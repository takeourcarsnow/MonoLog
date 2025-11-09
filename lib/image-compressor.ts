"use client";

import type { CompressionOptions, CompressionResult } from './image-worker';

class ImageCompressor {
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();

  constructor() {
    if (typeof window !== 'undefined' && 'Worker' in window) {
      this.initWorker();
    }
  }

  private initWorker() {
    try {
      this.worker = new Worker(new URL('./image-worker.ts', import.meta.url));

      this.worker.onmessage = (event) => {
        const { id, success, result, error } = event.data;
        const request = this.pendingRequests.get(id);

        if (request) {
          this.pendingRequests.delete(id);
          if (success) {
            request.resolve(result);
          } else {
            request.reject(new Error(error));
          }
        }
      };

      this.worker.onerror = (error) => {
        console.error('Image compression worker error:', error);
        // Reject all pending requests
        this.pendingRequests.forEach(({ reject }) => {
          reject(new Error('Worker error'));
        });
        this.pendingRequests.clear();
      };
    } catch (error) {
      console.warn('Failed to initialize image compression worker:', error);
    }
  }

  async compressImage(
    file: File,
    options: CompressionOptions = {}
  ): Promise<CompressionResult> {
    if (!this.worker) {
      throw new Error('Image compression worker not available');
    }

    return new Promise(async (resolve, reject) => {
      try {
        // Convert file to ImageData
        const imageData = await this.fileToImageData(file);
        const id = Math.random().toString(36).substr(2, 9);

        this.pendingRequests.set(id, { resolve, reject });

        this.worker!.postMessage({
          id,
          imageData,
          options
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          const request = this.pendingRequests.get(id);
          if (request) {
            this.pendingRequests.delete(id);
            reject(new Error('Compression timeout'));
          }
        }, 30000);

      } catch (error) {
        reject(error);
      }
    });
  }

  private async fileToImageData(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        try {
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          resolve(imageData);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pendingRequests.clear();
  }
}

// Export singleton instance
export const imageCompressor = new ImageCompressor();
export default imageCompressor;