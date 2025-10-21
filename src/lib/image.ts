import { CONFIG } from "./config";

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || typeof (file as any).size !== 'number' || typeof (file as any).type !== 'string') {
      return reject(new TypeError('fileToDataURL: expected a File/Blob but received: ' + String(file)));
    }
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('FileReader failed while reading file'));
    fr.onload = () => resolve(String(fr.result));
    try {
      fr.readAsDataURL(file);
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

function dataURLToBlob(dataUrl: string) {
  const [meta, b64] = dataUrl.split(",");
  const contentType = /data:(.*?);base64/.exec(meta)?.[1] || "application/octet-stream";
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

function approxDataUrlBytes(dataUrl: string) {
  return Math.round((dataUrl.length * 3) / 4);
}

export async function compressImage(fileOrDataUrl: File | string, maxEdge = CONFIG.imageMaxEdge, initialQuality = 0.86) {
  const dataUrl = typeof fileOrDataUrl === "string" ? fileOrDataUrl : await fileToDataURL(fileOrDataUrl);
  const blob = dataURLToBlob(dataUrl);

  const imgBitmap = await (async () => {
    if (typeof createImageBitmap !== "undefined") {
      try { return await createImageBitmap(blob, { imageOrientation: "from-image" as any }); } catch {}
    }
    const img = new Image();
    (img as any).crossOrigin = "anonymous";
    const url = URL.createObjectURL(blob);
    await new Promise((resolve, reject) => {
      img.onload = resolve as any; img.onerror = reject as any; img.src = url;
    });
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d")!.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const b = await new Promise<Blob | null>(res => c.toBlob(res));
    if (!b) throw new Error("Canvas toBlob failed");
    return await createImageBitmap(b);
  })();

  const { width, height } = imgBitmap as ImageBitmap;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  // create a canvas (OffscreenCanvas when available)
  const offscreen: any = ("OffscreenCanvas" in window) ? new (window as any).OffscreenCanvas(w, h) : document.createElement("canvas");
  offscreen.width = w; offscreen.height = h;
  const ctx = offscreen.getContext("2d");

  // iterative downscale: when reducing size a lot, downscale in steps by 50% to preserve quality
  const stepDownscale = async (srcBitmap: ImageBitmap, destW: number, destH: number) => {
    let curW = srcBitmap.width;
    let curH = srcBitmap.height;
    let bitmap: ImageBitmap | null = srcBitmap as any;

    while (curW / 2 > destW || curH / 2 > destH) {
      const nextW = Math.max(destW, Math.round(curW / 2));
      const nextH = Math.max(destH, Math.round(curH / 2));
      const tmp: any = ("OffscreenCanvas" in window) ? new (window as any).OffscreenCanvas(nextW, nextH) : document.createElement("canvas");
      tmp.width = nextW; tmp.height = nextH;
      const tctx = tmp.getContext("2d");
      if (tctx) {
        tctx.imageSmoothingEnabled = true;
        (tctx as any).imageSmoothingQuality = "high";
        tctx.drawImage(bitmap as any, 0, 0, nextW, nextH);
        // create blob and imageBitmap for next iteration
        const blob = await (tmp.convertToBlob ? tmp.convertToBlob({ type: "image/png" }) : new Promise<Blob | null>(res => tmp.toBlob(res)));
        if (!blob) break;
        bitmap = await createImageBitmap(blob);
      } else break;
      curW = nextW; curH = nextH;
    }

    // final draw to destination canvas
    ctx.imageSmoothingEnabled = true;
    (ctx as any).imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, destW, destH);
    ctx.drawImage(bitmap as any, 0, 0, destW, destH);
  };

  await stepDownscale(imgBitmap as ImageBitmap, w, h);

  const targetBytes = CONFIG.imageMaxSizeMB * 1024 * 1024;

  // detect webp support
  const supportsType = (type: string) => {
    try {
      const c = document.createElement('canvas');
      return c.toDataURL(type).indexOf(`data:${type}`) === 0;
    } catch {
      return false;
    }
  };

  const tryEncode = async (mime: string, quality: number) => {
    return new Promise<string>(resolve => {
      const finish = (b: Blob | null) => {
        if (!b) return resolve('');
        const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.readAsDataURL(b);
      };
      if (offscreen.convertToBlob) {
        offscreen.convertToBlob({ type: mime, quality }).then((b: Blob) => finish(b)).catch(() => finish(null));
      } else {
        try {
          offscreen.toBlob((b: Blob | null) => finish(b), mime, quality);
        } catch {
          finish(null);
        }
      }
    });
  };

  // binary search for quality to meet target bytes (returns best dataUrl)
  const findQuality = async (mime: string, minQ = 0.35, maxQ = initialQuality) => {
    let low = minQ, high = maxQ; let best: { q: number; dataUrl: string; size: number } | null = null;
    for (let i = 0; i < 6; i++) {
      const q = (low + high) / 2;
      const d = await tryEncode(mime, q);
      const size = d ? approxDataUrlBytes(d) : Infinity;
      if (size <= targetBytes) {
        best = { q, dataUrl: d, size };
        // try higher quality
        low = q;
      } else {
        high = q;
      }
      // stop early when range is small
      if (high - low < 0.03) break;
      await new Promise(r => requestAnimationFrame(r));
    }
    // if we never got under target, try at the minQ and return whatever is smallest
    if (!best) {
      const dLow = await tryEncode(mime, minQ);
      return { q: minQ, dataUrl: dLow, size: dLow ? approxDataUrlBytes(dLow) : Infinity };
    }
    return best;
  };

  // prefer WebP when supported (modern browsers) since it often yields smaller sizes
  const candidates: Array<{ mime: string; result: { q: number; dataUrl: string; size: number } } > = [];
  if (supportsType('image/webp')) {
    const res = await findQuality('image/webp');
    candidates.push({ mime: 'image/webp', result: res });
  }

  // always try jpeg as a fallback / compatibility option
  const jpegRes = await findQuality('image/jpeg');
  candidates.push({ mime: 'image/jpeg', result: jpegRes });

  // pick smallest size (prefer webp when same size)
  candidates.sort((a, b) => a.result.size - b.result.size || (a.mime === 'image/webp' ? -1 : 1));
  const chosen = candidates[0];

  // Ensure we have a valid result
  if (!chosen || !chosen.result || !chosen.result.dataUrl) {
    // Try multiple fallback strategies
    const fallbacks = [
      () => tryEncode('image/jpeg', Math.max(0.5, initialQuality - 0.2)),
      () => tryEncode('image/jpeg', 0.7),
      () => tryEncode('image/png', 1.0), // PNG as last resort (usually larger)
    ];

    for (const fallback of fallbacks) {
      try {
        const result = await fallback();
        if (result && result.length > 100) { // Basic check for valid data URL
          return result;
        }
      } catch (e) {
        // Continue to next fallback
      }
    }

    // If all fallbacks fail, throw an error
    throw new Error('Failed to compress image: all encoding attempts failed');
  }

  return chosen.result.dataUrl;
}

// exported for UI helpers (approximate compressed size in bytes)
export { approxDataUrlBytes };
