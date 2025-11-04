"use client";

import { lazy, Suspense } from "react";
import { compressImage, approxDataUrlBytes } from "@/lib/image";
import Portal from "@/app/components/ui/Portal";

// Lazy load the heavy ImageEditor component
const ImageEditor = lazy(() => import("@/app/components/media/ImageEditor"));

interface ImageEditorModalProps {
  editing: boolean;
  editingIndex: number;
  dataUrls: (string | null)[];
  originalDataUrls: (string | null)[];
  editorSettings: any[];
  editingAlt: string;
  onCancel: () => void;
  onApply: (newUrl: string, settings: any) => void;
  setAlt: (updater: any) => void;
  setEditorSettings: (updater: any) => void;
  setDataUrls: (updater: any) => void;
  setPreviewLoaded: (setter: boolean) => void;
  setCompressedSize: (size: number) => void;
  setOriginalSize: (size: number) => void;
  setProcessing: (processing: boolean) => void;
}

export function ImageEditorModal({
  editing,
  editingIndex,
  dataUrls,
  originalDataUrls,
  editorSettings,
  editingAlt,
  onCancel,
  onApply,
  setAlt,
  setEditorSettings,
  setDataUrls,
  setPreviewLoaded,
  setCompressedSize,
  setOriginalSize,
  setProcessing,
}: ImageEditorModalProps) {
  if (!editing || (!dataUrls[editingIndex] && !dataUrls[0])) {
    return null;
  }

  const currentDataUrl = (originalDataUrls[editingIndex] || dataUrls[editingIndex] || originalDataUrls[0] || dataUrls[0]) as string;
  const currentSettings = editorSettings[editingIndex] || {};

  const handleApply = async (newUrl: string, settings: any) => {
    setAlt((prev: any) => {
      if (Array.isArray(prev)) {
        const copy = [...prev];
        copy[editingIndex] = editingAlt || "";
        return copy;
      }
      if (dataUrls.length > 1) {
        const arr = dataUrls.map((_, i) => i === editingIndex ? (editingAlt || "") : (i === 0 ? (prev as string) || "" : ""));
        return arr;
      }
      return editingAlt || "";
    });

    setEditorSettings((prev: any[]) => {
      const copy = [...prev];
      while (copy.length <= editingIndex) copy.push({});
      copy[editingIndex] = settings;
      return copy;
    });

    setProcessing(true);
    try {
      const compressed = await compressImage(newUrl as any);
      setDataUrls((d: (string | null)[]) => {
        const copy = [...d];
        copy[editingIndex] = compressed;
        return copy;
      });
      if (editingIndex === 0) { setPreviewLoaded(false); }
      setCompressedSize(approxDataUrlBytes(compressed));
      setOriginalSize(approxDataUrlBytes(newUrl));
    } catch (e) {
      console.error(e);
      setDataUrls((d: (string | null)[]) => {
        const copy = [...d];
        copy[editingIndex] = newUrl as string;
        return copy;
      });
      if (editingIndex === 0) { setPreviewLoaded(false); }
      setCompressedSize(approxDataUrlBytes(newUrl as string));
    } finally {
      setProcessing(false);
      onApply(newUrl, settings);
    }
  };

  return (
    <Portal className="upload-editor-fullscreen">
      <Suspense fallback={
        <div className="upload-editor-loading">
          <div className="card skeleton" style={{ height: 400, width: '100%', maxWidth: 600 }} />
        </div>
      }>
        <ImageEditor
          initialDataUrl={currentDataUrl}
          initialSettings={currentSettings}
          onCancel={onCancel}
          onApply={handleApply}
        />
      </Suspense>
    </Portal>
  );
}