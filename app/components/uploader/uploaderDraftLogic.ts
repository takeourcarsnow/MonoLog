"use client";

import { DRAFT_KEY, EDITING_SESSION_KEY } from "./constants";

export function createDraftHandlers(
  setJustDiscarded: (discarded: boolean) => void,
  setDataUrls: React.Dispatch<React.SetStateAction<string[]>>,
  setOriginalDataUrls: React.Dispatch<React.SetStateAction<string[]>>,
  setEditorSettings: React.Dispatch<React.SetStateAction<any[]>>,
  setCaption: (caption: string) => void,
  setSpotifyLink: (link: string) => void,
  setCamera: (camera: string) => void,
  setLens: (lens: string) => void,
  setFilmType: (type: string) => void,
  setFilmIso: (iso: string) => void,
  setWeatherCondition: (condition: string) => void,
  setWeatherTemperature: (temperature: number | undefined) => void,
  setWeatherLocation: (location: string) => void,
  setLocationLatitude: (latitude: number | undefined) => void,
  setLocationLongitude: (longitude: number | undefined) => void,
  setLocationAddress: (address: string) => void,
  setAlt: (alt: string | string[]) => void,
  setVisibility: (visibility: "public" | "private") => void,
  setCompressedSize: (size: number | null) => void,
  setOriginalSize: (size: number | null) => void,
  setIndex: (index: number) => void,
  setPreviewLoaded: (loaded: boolean) => void,
  setEditing: (editing: boolean) => void,
  fileInputRef: React.RefObject<HTMLInputElement>,
  cameraInputRef: React.RefObject<HTMLInputElement>,
  dataUrls: string[],
  alt: string | string[],
  originalDataUrls: string[],
  editorSettings: any[],
  index: number
) {
  function resetDraft() {
    // Add blur effect before clearing data
    setJustDiscarded(true);

    // Clear data after blur starts
    setTimeout(() => {
      try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
      sessionStorage.removeItem(EDITING_SESSION_KEY);
      setDataUrls([]);
      setOriginalDataUrls([]);
      setEditorSettings([]);
      setCaption("");
      setSpotifyLink("");
      setCamera("");
      setLens("");
      setFilmType("");
      setFilmIso("");
      setWeatherCondition("");
      setWeatherTemperature(undefined);
      setWeatherLocation("");
      setLocationLatitude(undefined);
      setLocationLongitude(undefined);
      setLocationAddress("");
      setAlt("");
      setVisibility("public");
      setCompressedSize(null);
      setOriginalSize(null);
      setIndex(0);
      setPreviewLoaded(false);
      setEditing(false);
      // Clear file inputs to allow re-selection
      try { if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = ""; } catch (e) {}
      try { if (cameraInputRef.current) (cameraInputRef.current as HTMLInputElement).value = ""; } catch (e) {}

      // Remove blur after data is cleared
      setTimeout(() => setJustDiscarded(false), 200);
    }, 100);
  }

  function removePhoto(atIndex: number) {
    if (dataUrls.length === 0) return;
    const safeIndex = Math.min(atIndex, dataUrls.length - 1);
    const newDataUrls = dataUrls.filter((_, i) => i !== safeIndex);
    const newOriginalDataUrls = originalDataUrls.filter((_, i) => i !== safeIndex);
    const newEditorSettings = editorSettings.filter((_, i) => i !== safeIndex);
    setDataUrls(newDataUrls);
    setOriginalDataUrls(newOriginalDataUrls);
    setEditorSettings(newEditorSettings);
    // Reset blur state when photos are present to prevent stuck blur
    if (newDataUrls.length > 0) {
      setJustDiscarded(false);
    }
    if (Array.isArray(alt)) {
      setAlt(alt.filter((_, i) => i !== safeIndex));
    }
    if (newDataUrls.length === 0) {
      // Clear all inputs when no photos remain
      setCaption("");
      setSpotifyLink("");
      setCamera("");
      setLens("");
      setFilmType("");
      setFilmIso("");
      setWeatherCondition("");
      setWeatherTemperature(undefined);
      setWeatherLocation("");
      setLocationLatitude(undefined);
      setLocationLongitude(undefined);
      setLocationAddress("");
      setAlt("");
      setIndex(0);
    } else {
      if (safeIndex === 0) {
        // first image changed, ensure preview shows the first element
      }
      if (index >= newDataUrls.length) {
        setIndex(Math.max(0, newDataUrls.length - 1));
      }
    }
    setPreviewLoaded(false);
  }

  return {
    resetDraft,
    removePhoto,
  };
}