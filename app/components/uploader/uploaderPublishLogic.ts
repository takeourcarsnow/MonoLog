"use client";

import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { CONFIG } from "@/src/lib/config";
import { useToast } from "../Toast";

export function createPublishHandler(
  toast: ReturnType<typeof useToast>,
  setProcessing: (processing: boolean) => void,
  resetDraft: () => void,
  router: ReturnType<typeof useRouter>,
  dataUrls: string[],
  caption: string,
  alt: string | string[],
  visibility: "public" | "private",
  compressedSize: number | null,
  spotifyLink: string,
  camera: string,
  lens: string,
  filmType: string,
  filmIso: string
) {
  async function publish() {
    const images = dataUrls.length ? dataUrls : [];
    if (!images.length) return toast.show("Please select at least one image");
    const maxBytes = CONFIG.imageMaxSizeMB * 1024 * 1024;
    if (compressedSize && compressedSize > maxBytes) {
      return toast.show(`Compressed image is too large (${Math.round(compressedSize/1024)} KB). Try a smaller photo or reduce quality.`);
    }
    setProcessing(true);
    try {
      await api.createOrReplaceToday({
        imageUrls: images.slice(0, 5),
        caption,
        spotifyLink: spotifyLink || undefined,
        alt: alt || caption || "Photo from today's entry",
        public: visibility === "public",
        camera: camera || undefined,
        lens: lens || undefined,
        filmType: (filmType && filmIso) ? `${filmType} ${filmIso}` : (filmType || filmIso) || undefined,
      });
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('monolog:post_created', { detail: { replaced: false } }));
        }
      } catch (_) { /* ignore */ }
      resetDraft();
      router.push("/");
    } catch (e: any) {
      if (e?.code === "LIMIT") {
        toast.show("You already posted today.");
      } else {
        toast.show(e?.message || "Failed to publish");
      }
      setProcessing(false);
    }
  }

  return {
    publish,
  };
}