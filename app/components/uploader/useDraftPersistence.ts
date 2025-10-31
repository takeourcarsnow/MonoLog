import { useEffect, useRef } from "react";
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
  setSpotifyLink: (link: string) => void,
  camera: string,
  setCamera: (camera: string) => void,
  lens: string,
  setLens: (lens: string) => void,
  filmType: string,
  setFilmType: (filmType: string) => void,
  filmIso: string,
  setFilmIso: (filmIso: string) => void,
  weatherCondition: string,
  setWeatherCondition: (condition: string) => void,
  weatherTemperature: number | undefined,
  setWeatherTemperature: (temperature: number | undefined) => void,
  weatherLocation: string,
  setWeatherLocation: (location: string) => void,
  locationLatitude: number | undefined,
  setLocationLatitude: (latitude: number | undefined) => void,
  locationLongitude: number | undefined,
  setLocationLongitude: (longitude: number | undefined) => void,
  locationAddress: string,
  setLocationAddress: (address: string) => void
) {
  const captionDebounceRef = useRef<NodeJS.Timeout | null>(null);
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
      if (parsed.camera !== undefined) setCamera(parsed.camera);
      if (parsed.lens !== undefined) setLens(parsed.lens);
      if (parsed.filmType !== undefined) setFilmType(parsed.filmType);
      if (parsed.filmIso !== undefined) setFilmIso(parsed.filmIso);
      if (parsed.weatherCondition !== undefined) setWeatherCondition(parsed.weatherCondition);
      if (parsed.weatherTemperature !== undefined) setWeatherTemperature(parsed.weatherTemperature);
      if (parsed.weatherLocation !== undefined) setWeatherLocation(parsed.weatherLocation);
      if (parsed.locationLatitude !== undefined) setLocationLatitude(parsed.locationLatitude);
      if (parsed.locationLongitude !== undefined) setLocationLongitude(parsed.locationLongitude);
      if (parsed.locationAddress !== undefined) setLocationAddress(parsed.locationAddress);
    } catch (e) {
      // ignore parse errors
    }
  }, [setDataUrls, setOriginalDataUrls, setEditorSettings, setCaption, setAlt, setVisibility, setCompressedSize, setOriginalSize, setIndex, setSpotifyLink, setCamera, setLens, setFilmType, setFilmIso, setWeatherCondition, setWeatherTemperature, setWeatherLocation, setLocationLatitude, setLocationLongitude, setLocationAddress]);

  // Persist draft whenever key pieces of state change (excluding caption for performance)
  useEffect(() => {
    try {
      const payload: any = {
        dataUrls: dataUrls.length ? dataUrls : undefined,
        originalDataUrls: originalDataUrls.length ? originalDataUrls : undefined,
        editorSettings: editorSettings.length ? editorSettings : undefined,
        // caption persisted separately with debounce
        alt: alt === undefined ? undefined : alt,
        visibility,
        compressedSize: compressedSize ?? undefined,
        originalSize: originalSize ?? undefined,
        spotifyLink: spotifyLink || undefined,
        index,
        camera: camera || undefined,
        lens: lens || undefined,
        filmType: filmType || undefined,
        filmIso: filmIso || undefined,
        weatherCondition: weatherCondition || undefined,
        weatherTemperature: weatherTemperature ?? undefined,
        weatherLocation: weatherLocation || undefined,
        locationLatitude: locationLatitude ?? undefined,
        locationLongitude: locationLongitude ?? undefined,
        locationAddress: locationAddress || undefined,
        savedAt: Date.now(),
      };

      // Defensive merge: preserve existing optional fields if not set
      try {
        const existingRaw = localStorage.getItem(DRAFT_KEY);
        if (existingRaw) {
          const existing = JSON.parse(existingRaw);
          if (existing.caption !== undefined && payload.caption === undefined) payload.caption = existing.caption;
          if (existing.spotifyLink && !payload.spotifyLink) payload.spotifyLink = existing.spotifyLink;
          if (existing.camera && !payload.camera) payload.camera = existing.camera;
          if (existing.lens && !payload.lens) payload.lens = existing.lens;
          if (existing.filmType && !payload.filmType) payload.filmType = existing.filmType;
          if (existing.filmIso && !payload.filmIso) payload.filmIso = existing.filmIso;
          if (existing.weatherCondition && !payload.weatherCondition) payload.weatherCondition = existing.weatherCondition;
          if (existing.weatherTemperature !== undefined && payload.weatherTemperature === undefined) payload.weatherTemperature = existing.weatherTemperature;
          if (existing.weatherLocation && !payload.weatherLocation) payload.weatherLocation = existing.weatherLocation;
          if (existing.locationLatitude !== undefined && payload.locationLatitude === undefined) payload.locationLatitude = existing.locationLatitude;
          if (existing.locationLongitude !== undefined && payload.locationLongitude === undefined) payload.locationLongitude = existing.locationLongitude;
          if (existing.locationAddress && !payload.locationAddress) payload.locationAddress = existing.locationAddress;
        }
      } catch (e) {
        // ignore parse errors and fall back to writing payload as-is
      }

      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch (e) {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [dataUrls, originalDataUrls, editorSettings, alt, visibility, compressedSize, originalSize, index, spotifyLink, camera, lens, filmType, filmIso, weatherCondition, weatherTemperature, weatherLocation, locationLatitude, locationLongitude, locationAddress]);

  // Debounced persistence for caption to avoid lag on mobile typing
  useEffect(() => {
    if (captionDebounceRef.current) clearTimeout(captionDebounceRef.current);
    captionDebounceRef.current = setTimeout(() => {
      try {
        const existingRaw = localStorage.getItem(DRAFT_KEY);
        let payload: any = {};
        if (existingRaw) {
          payload = JSON.parse(existingRaw);
        }
        payload.caption = caption || undefined;
        payload.savedAt = Date.now();
        localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      } catch (e) {
        // ignore storage errors
      }
    }, 500); // 500ms debounce for caption changes

    return () => {
      if (captionDebounceRef.current) clearTimeout(captionDebounceRef.current);
    };
  }, [caption]);
}
