import { usePathname } from "next/navigation";
import { lazy, Suspense } from "react";
import { EditorSettings } from "../imageEditor/types";
import { compressImage, approxDataUrlBytes } from "@/src/lib/image";

// Lazy load the heavy ImageEditor component
const ImageEditor = lazy(() => import("../ImageEditor"));

interface ImageEditorSectionProps {
  editing: boolean;
  editingIndex: number;
  dataUrls: string[];
  dataUrl: string | null;
  originalDataUrls: string[];
  editorSettings: EditorSettings[];
  editingAlt: string;
  setAlt: React.Dispatch<React.SetStateAction<string | string[]>>;
  setEditorSettings: React.Dispatch<React.SetStateAction<EditorSettings[]>>;
  setDataUrls: React.Dispatch<React.SetStateAction<string[]>>;
  setDataUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setPreviewLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  setCompressedSize: React.Dispatch<React.SetStateAction<number | null>>;
  setOriginalSize: React.Dispatch<React.SetStateAction<number | null>>;
  setProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
}

export function ImageEditorSection({
  editing,
  editingIndex,
  dataUrls,
  dataUrl,
  originalDataUrls,
  editorSettings,
  editingAlt,
  setAlt,
  setEditorSettings,
  setDataUrls,
  setDataUrl,
  setPreviewLoaded,
  setCompressedSize,
  setOriginalSize,
  setProcessing,
  setEditing
}: ImageEditorSectionProps) {
  const pathname = usePathname();

  if (!editing || pathname !== '/upload' || !(dataUrls[editingIndex] || dataUrl)) {
    return null;
  }

  return (
    <div style={{ width: '100%' }}>
      <Suspense fallback={<div className="card skeleton" style={{ height: 400 }} />}>
        <ImageEditor
          initialDataUrl={(originalDataUrls[editingIndex] || dataUrls[editingIndex] || originalDataUrls[0] || dataUrl) as string}
          initialSettings={editorSettings[editingIndex] || {}}
          onCancel={() => setEditing(false)}
          onApply={async (newUrl, settings) => {
            setAlt(prev => {
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
            setEditorSettings(prev => {
              const copy = [...prev];
              while (copy.length <= editingIndex) copy.push({});
              copy[editingIndex] = settings;
              return copy;
            });
            setProcessing(true);
            try {
              const compressed = await compressImage(newUrl as any);
              setDataUrls(d => {
                const copy = [...d];
                copy[editingIndex] = compressed;
                return copy;
              });
              if (editingIndex === 0) { setDataUrl(compressed); setPreviewLoaded(false); }
              setCompressedSize(approxDataUrlBytes(compressed));
              setOriginalSize(approxDataUrlBytes(newUrl));
            } catch (e) {
              console.error(e);
              setDataUrls(d => {
                const copy = [...d];
                copy[editingIndex] = newUrl as string;
                return copy;
              });
              if (editingIndex === 0) { setDataUrl(newUrl as string); setPreviewLoaded(false); }
              setCompressedSize(approxDataUrlBytes(newUrl as string));
            } finally {
              setProcessing(false);
              setEditing(false);
            }
          }}
        />
      </Suspense>
    </div>
  );
}
