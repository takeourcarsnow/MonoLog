import { useEffect } from "react";
import { DRAFT_KEY } from "./constants";

export function useDraftPersistence(
  dataUrls: string[],
  setDataUrls: (urls: string[]) => void,
  originalDataUrls: string[],
  setOriginalDataUrls: (urls: string[]) => void,
  editorSettings: any[],
  setEditorSettings: (settings: any[]) => void,
  dataUrl: string | null,
  setDataUrl: (url: string | null) => void,
  caption: string,
  setCaption: (caption: string) => void,
  alt: string | string[],
  setAlt: (alt: string | string[]) => void,
  visibility: "public" | "private",
  setVisibility: (visibility: "public" | "private") => void,
  compressedSize: number | null,
  setCompressedSize: (size: number | null) => void,
  originalSize: number | null,
  setOriginalSize: (size: number | null) => void,
  index: number,
  setIndex: (index: number) => void
) {
  // restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (parsed.dataUrls) setDataUrls(parsed.dataUrls);
          if (parsed.originalDataUrls) setOriginalDataUrls(parsed.originalDataUrls);
          if (parsed.editorSettings) setEditorSettings(parsed.editorSettings);
          if (parsed.dataUrl) setDataUrl(parsed.dataUrl);
          if (parsed.caption) setCaption(parsed.caption);
          if (parsed.alt !== undefined) setAlt(parsed.alt);
          // Restore visibility only if the persisted draft actually contains images.
          // This ensures a fresh composer defaults to public even if a previous draft
          // had changed visibility without images.
          if (parsed.visibility && (parsed.dataUrls || parsed.dataUrl)) setVisibility(parsed.visibility);
          if (parsed.compressedSize !== undefined) setCompressedSize(parsed.compressedSize);
          if (parsed.originalSize !== undefined) setOriginalSize(parsed.originalSize);
          if (parsed.index !== undefined) setIndex(parsed.index);
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  }, [setDataUrls, setOriginalDataUrls, setEditorSettings, setDataUrl, setCaption, setAlt, setVisibility, setCompressedSize, setOriginalSize, setIndex]);

  // Persist draft whenever key pieces of state change
  useEffect(() => {
    try {
      const payload = {
        dataUrls: dataUrls.length ? dataUrls : undefined,
        originalDataUrls: originalDataUrls.length ? originalDataUrls : undefined,
        editorSettings: editorSettings.length ? editorSettings : undefined,
        dataUrl: dataUrl || undefined,
        caption: caption || undefined,
        alt: alt === undefined ? undefined : alt,
        visibility,
        compressedSize: compressedSize ?? undefined,
        originalSize: originalSize ?? undefined,
        index,
        // timestamp could be useful for future TTL
        savedAt: Date.now(),
      } as any;
      // Defensive merge: if we're about to persist a payload with no images,
      // but there's an existing saved draft that does contain images, keep
      // those images to avoid accidentally losing them (for example when
      // opening the file picker and cancelling).
      try {
        const existingRaw = localStorage.getItem(DRAFT_KEY);
        if (existingRaw) {
          const existing = JSON.parse(existingRaw);
          if ((!payload.dataUrls && !payload.dataUrl) && (existing?.dataUrls || existing?.dataUrl)) {
            if (existing.dataUrls) payload.dataUrls = existing.dataUrls;
            else if (existing.dataUrl) payload.dataUrl = existing.dataUrl;
            if (existing.originalDataUrls) payload.originalDataUrls = existing.originalDataUrls;
            if (existing.editorSettings) payload.editorSettings = existing.editorSettings;
          }
        }
      } catch (e) {
        // ignore parse errors and fall back to writing payload as-is
      }
      // only keep keys that are set to reduce size
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch (e) {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [dataUrls, originalDataUrls, editorSettings, dataUrl, caption, alt, visibility, compressedSize, originalSize, index]);
}
