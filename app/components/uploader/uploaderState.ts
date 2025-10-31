"use client";

import { useState, useCallback } from "react";

export function useUploaderState() {
  const CAPTION_MAX = 1000;
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [dataUrls, setDataUrls] = useState<string[]>([]);
  const [originalDataUrls, setOriginalDataUrls] = useState<string[]>([]);
  const [editorSettings, setEditorSettings] = useState<any[]>([]);
  const [alt, setAlt] = useState<string | string[]>("");
  const [caption, setCaption] = useState("");
  const [captionFocused, setCaptionFocused] = useState(false);
  const [spotifyLink, setSpotifyLink] = useState("");
  const [camera, setCamera] = useState("");
  const [lens, setLens] = useState("");
  const [filmType, setFilmType] = useState("");
  const [filmIso, setFilmIso] = useState("");
  const [weatherCondition, setWeatherCondition] = useState("");
  const [weatherTemperature, setWeatherTemperature] = useState<number | undefined>(undefined);
  const [weatherLocation, setWeatherLocation] = useState("");
  const [locationLatitude, setLocationLatitude] = useState<number | undefined>(undefined);
  const [locationLongitude, setLocationLongitude] = useState<number | undefined>(undefined);
  const [locationAddress, setLocationAddress] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number>(0);
  const [editingAlt, setEditingAlt] = useState<string>("");
  const [index, setIndex] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [justDiscarded, setJustDiscarded] = useState(false);

  // Provide a stable wrapper for setAlt so draft persistence doesn't get a
  // new function on every render (which would retrigger its effects).
  const setAltForDraft = useCallback((v: string | string[] | undefined) => {
    setAlt(v ?? "");
  }, []);

  return {
    CAPTION_MAX,
    originalSize,
    dataUrls,
    originalDataUrls,
    editorSettings,
    alt,
    caption,
    spotifyLink,
    camera,
    lens,
    filmType,
    filmIso,
    weatherCondition,
    weatherTemperature,
    weatherLocation,
    locationLatitude,
    locationLongitude,
    locationAddress,
    captionFocused,
    visibility,
    previewLoaded,
    editing,
    editingIndex,
    editingAlt,
    index,
    processing,
    compressedSize,
    confirmCancel,
    justDiscarded,
    setOriginalSize,
    setDataUrls,
    setOriginalDataUrls,
    setEditorSettings,
    setAlt,
    setCaption,
    setSpotifyLink,
    setCamera,
    setLens,
    setFilmType,
    setFilmIso,
    setWeatherCondition,
    setWeatherTemperature,
    setWeatherLocation,
    setLocationLatitude,
    setLocationLongitude,
    setLocationAddress,
    setCaptionFocused,
    setVisibility,
    setPreviewLoaded,
    setEditing,
    setEditingIndex,
    setEditingAlt,
    setIndex,
    setProcessing,
    setCompressedSize,
    setConfirmCancel,
    setJustDiscarded,
    setAltForDraft,
  };
}