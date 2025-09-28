import { CONFIG } from "./config";

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = reject;
    fr.onload = () => resolve(String(fr.result));
    fr.readAsDataURL(file);
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

  const offscreen: any = ("OffscreenCanvas" in window) ? new (window as any).OffscreenCanvas(w, h) : document.createElement("canvas");
  offscreen.width = w; offscreen.height = h;
  const ctx = offscreen.getContext("2d");
  ctx.drawImage(imgBitmap as any, 0, 0, w, h);

  let q = initialQuality;
  const makeDataUrl = (): Promise<string> => new Promise(resolve => {
    if (offscreen.convertToBlob) {
      offscreen.convertToBlob({ type: "image/jpeg", quality: q }).then((blob: Blob) => {
        const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.readAsDataURL(blob);
      });
    } else {
      offscreen.toBlob((b: Blob) => {
        const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.readAsDataURL(b);
      }, "image/jpeg", q);
    }
  });

  let out = await makeDataUrl();

  const targetBytes = CONFIG.imageMaxSizeMB * 1024 * 1024;
  let tries = 0;
  while (approxDataUrlBytes(out) > targetBytes && q > 0.5 && tries < 4) {
    q -= 0.1; tries++;
    out = await makeDataUrl();
    await new Promise(r => requestAnimationFrame(r));
  }

  return out;
}