// Web Worker for image compression
// This offloads image processing to a separate thread to prevent blocking the main UI

self.onmessage = async function(e) {
  const { dataUrl, maxEdge, initialQuality, targetBytes } = e.data;

  try {
    // Convert data URL to blob
    const [meta, b64] = dataUrl.split(",");
    const contentType = /data:(.*?);base64/.exec(meta)?.[1] || "application/octet-stream";
    const bin = atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: contentType });

    // Create ImageBitmap for processing
    const imgBitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
    
    const { width, height } = imgBitmap;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    // Create OffscreenCanvas for processing
    const offscreen = new OffscreenCanvas(w, h);
    const ctx = offscreen.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    // Iterative downscale for better quality
    let curW = width;
    let curH = height;
    let bitmap = imgBitmap;

    while (curW / 2 > w || curH / 2 > h) {
      const nextW = Math.max(w, Math.round(curW / 2));
      const nextH = Math.max(h, Math.round(curH / 2));
      const tmp = new OffscreenCanvas(nextW, nextH);
      const tctx = tmp.getContext("2d");
      
      if (tctx) {
        tctx.imageSmoothingEnabled = true;
        tctx.imageSmoothingQuality = "high";
        tctx.drawImage(bitmap, 0, 0, nextW, nextH);
        const tmpBlob = await tmp.convertToBlob({ type: "image/png" });
        bitmap = await createImageBitmap(tmpBlob);
      }
      curW = nextW;
      curH = nextH;
    }

    // Final draw
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);

    // Try WebP first, then JPEG
    const tryEncode = async (mime: string, quality: number) => {
      const blob = await offscreen.convertToBlob({ type: mime, quality });
      return blob;
    };

    const approxBlobSize = (blob: Blob) => blob.size;

    // Binary search for optimal quality
    const findQuality = async (mime: string, minQ = 0.35, maxQ = initialQuality) => {
      let low = minQ, high = maxQ;
      let best = null;
      
      for (let i = 0; i < 6; i++) {
        const q = (low + high) / 2;
        const blob = await tryEncode(mime, q);
        const size = approxBlobSize(blob);
        
        if (size <= targetBytes) {
          best = { q, blob, size };
          low = q;
        } else {
          high = q;
        }
        
        if (high - low < 0.03) break;
      }
      
      if (!best) {
        const blob = await tryEncode(mime, minQ);
        return { q: minQ, blob, size: approxBlobSize(blob) };
      }
      
      return best;
    };

    // Try both formats and pick the best
    const candidates = [];
    
    // WebP
    const webpRes = await findQuality('image/webp');
    candidates.push({ mime: 'image/webp', result: webpRes });
    
    // JPEG fallback
    const jpegRes = await findQuality('image/jpeg');
    candidates.push({ mime: 'image/jpeg', result: jpegRes });

    // Pick smallest
    candidates.sort((a, b) => a.result.size - b.result.size);
    const chosen = candidates[0];

    // Convert blob to data URL
    const blobToDataURL = (blob: Blob): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };
    
    const resultDataUrl = await blobToDataURL(chosen.result.blob);

    // Send result back to main thread
    self.postMessage({
      success: true,
      dataUrl: resultDataUrl,
      format: chosen.mime,
      size: chosen.result.size
    });

  } catch (error: any) {
    self.postMessage({
      success: false,
      error: error?.message || 'Unknown error'
    });
  }
};
