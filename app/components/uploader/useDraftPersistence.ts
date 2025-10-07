import { useEffect } from "react";
import { DRAFT_KEY } from "./constants";

export function useDraftPersistence(
  dataUrls: string[],
  setDataUrls: (urls: string[]) => void,
  originalDataUrls: string[],
  setOriginalDataUrls: (urls: string[]) => void,
  editorSettings: any[],
  setEditorSettings: (settings: any[]) => void,
  caption: string,
  setCaption: (caption: string) => void,
  alt: string | string[] | undefined,
  setAlt: (alt: string | string[] | undefined) => void,
  visibility: "public" | "private",
  setVisibility: (visibility: "public" | "private") => void,
  compressedSize: number | null,
  setCompressedSize: (size: number | null) => void,
  originalSize: number | null,
  setOriginalSize: (size: number | null) => void,
  index: number,
  setIndex: (index: number) => void,
  spotifyLink: string,
  setSpotifyLink: (link: string) => void
) {
  // restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed) return;

      // Prefer the modern `dataUrls` array. If an older draft stored a
      // single `dataUrl`, migrate it into the array form.
      if (parsed.dataUrls) setDataUrls(parsed.dataUrls);
      else if (parsed.dataUrl) setDataUrls([parsed.dataUrl]);

      if (parsed.originalDataUrls) setOriginalDataUrls(parsed.originalDataUrls);
      if (parsed.editorSettings) setEditorSettings(parsed.editorSettings);
      if (parsed.caption) setCaption(parsed.caption);
      if (parsed.alt !== undefined) setAlt(parsed.alt);

      // Restore visibility only if the persisted draft actually contains images.
      if (parsed.visibility && (parsed.dataUrls || parsed.dataUrl)) setVisibility(parsed.visibility);

      if (parsed.compressedSize !== undefined) setCompressedSize(parsed.compressedSize);
      if (parsed.originalSize !== undefined) setOriginalSize(parsed.originalSize);
      if (parsed.index !== undefined) setIndex(parsed.index);
      if (parsed.spotifyLink !== undefined) setSpotifyLink(parsed.spotifyLink);
    } catch (e) {
      // ignore parse errors
    }
  }, [setDataUrls, setOriginalDataUrls, setEditorSettings, setCaption, setAlt, setVisibility, setCompressedSize, setOriginalSize, setIndex, setSpotifyLink]);

  // Persist draft whenever key pieces of state change
  useEffect(() => {
    try {
      const payload: any = {
        dataUrls: dataUrls.length ? dataUrls : undefined,
        originalDataUrls: originalDataUrls.length ? originalDataUrls : undefined,
        editorSettings: editorSettings.length ? editorSettings : undefined,
        caption: caption || undefined,
        alt: alt === undefined ? undefined : alt,
        visibility,
        compressedSize: compressedSize ?? undefined,
        originalSize: originalSize ?? undefined,
        spotifyLink: spotifyLink || undefined,
        index,
        savedAt: Date.now(),
      };

      // Defensive merge: preserve existing saved images if the new payload
      // contains no images (for example, when opening the file picker and
      // cancelling). Also migrate legacy single-image drafts to the modern
      // array form if present in existing storage.
      try {
        const existingRaw = localStorage.getItem(DRAFT_KEY);
        if (existingRaw) {
          const existing = JSON.parse(existingRaw);
          if (!payload.dataUrls && existing?.dataUrls) {
            payload.dataUrls = existing.dataUrls;
          } else if (!payload.dataUrls && existing?.dataUrl) {
            // migrate legacy single-image into dataUrls
            payload.dataUrls = [existing.dataUrl];
          }
          if (existing.originalDataUrls) payload.originalDataUrls = existing.originalDataUrls;
          if (existing.editorSettings) payload.editorSettings = existing.editorSettings;
          if (existing.spotifyLink && !payload.spotifyLink) payload.spotifyLink = existing.spotifyLink;
        }
      } catch (e) {
        // ignore parse errors and fall back to writing payload as-is
      }

      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch (e) {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [dataUrls, originalDataUrls, editorSettings, caption, alt, visibility, compressedSize, originalSize, index, spotifyLink]);
}
