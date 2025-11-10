"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { CONFIG } from "@/lib/config";

export function createPublishHandler(
  toast: { show: (msg: unknown) => void } | undefined,
  setProcessing: (processing: boolean) => void,
  setPublishing: (publishing: boolean) => void,
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
  filmIso: string,
  weatherCondition: string,
  weatherTemperature: number | undefined,
  locationAddress: string
) {
  async function publish() {
    const images = dataUrls.length ? dataUrls : [];
    if (!images.length) { console.warn("Please select at least one image"); return; }
    const maxBytes = CONFIG.imageMaxSizeMB * 1024 * 1024;
    if (compressedSize && compressedSize > maxBytes) {
      console.warn(`Compressed image is too large (${Math.round(compressedSize/1024)} KB). Try a smaller photo or reduce quality.`);
      return;
    }
    setProcessing(true);
    setPublishing(true);
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
        weatherCondition: weatherCondition || undefined,
        weatherTemperature: weatherTemperature ?? undefined,
        locationAddress: locationAddress || undefined,
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
        console.warn("You already posted today.");
      } else {
        console.warn(e?.message || "Failed to publish");
      }
      setProcessing(false);
      setPublishing(false);
    }
  }

  return {
    publish,
  };
}