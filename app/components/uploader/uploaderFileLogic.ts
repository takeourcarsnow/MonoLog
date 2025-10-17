"use client";

import { compressImage, approxDataUrlBytes } from "@/src/lib/image";
import { useToast } from "../Toast";
import exifr from 'exifr';

export function createFileHandlers(
  toast: ReturnType<typeof useToast>,
  setProcessing: (processing: boolean) => void,
  setPreviewLoaded: (loaded: boolean) => void,
  setOriginalSize: (size: number | null) => void,
  setCompressedSize: (size: number | null) => void,
  setDataUrls: React.Dispatch<React.SetStateAction<string[]>>,
  setOriginalDataUrls: React.Dispatch<React.SetStateAction<string[]>>,
  setEditorSettings: React.Dispatch<React.SetStateAction<any[]>>,
  setIndex: (index: number) => void,
  setEditing: (editing: boolean) => void,
  setAlt: (alt: string | string[]) => void,
  setCamera: (camera: string) => void,
  setLens: (lens: string) => void,
  fileInputRef: React.RefObject<HTMLInputElement>,
  dataUrls: string[],
  alt: string | string[],
  caption: string,
  fileActionRef: React.MutableRefObject<'append' | 'replace'>,
  replaceIndexRef: React.MutableRefObject<number | null>,
  index: number
) {
  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.show("Please select an image file");
      return;
    }
    setProcessing(true);
    setPreviewLoaded(false);
    setOriginalSize(file.size);
    setCompressedSize(null);
    try {
      const url = await compressImage(file);
      const bytes = approxDataUrlBytes(url);
      setCompressedSize(bytes);
      setDataUrls(d => {
        const next = [...d, url].slice(0, 5);
        return next;
      });
      setOriginalDataUrls(d => {
        const next = [...d, url].slice(0, 5);
        return next;
      });
      setEditorSettings(s => {
        const next = [...s, {}].slice(0, 5);
        return next;
      });
      setIndex(dataUrls.length); // Auto-select the newly added photo
      setEditing(false);
      try { if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = ""; } catch (e) {}
      if (!alt && caption) setAlt(caption);

      // Extract EXIF data
      try {
        const exif = await exifr.parse(file, { pick: ['Make', 'Model', 'LensModel', 'LensMake'] });
        if (exif) {
          const cameraMake = exif.Make || '';
          const cameraModel = exif.Model || '';
          const camera = cameraMake && cameraModel ? `${cameraMake} ${cameraModel}` : cameraMake || cameraModel || '';
          const lensMake = exif.LensMake || '';
          const lensModel = exif.LensModel || '';
          const lens = lensMake && lensModel ? `${lensMake} ${lensModel}` : lensMake || lensModel || '';
          if (camera) setCamera(camera);
          if (lens) setLens(lens);
        }
      } catch (e) {
        // Ignore EXIF extraction errors
      }
    } catch (e) {
      console.error(e);
      toast.show("Failed to process image");
      try { if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = ""; } catch (e) {}
    } finally {
      setProcessing(false);
    }
  }

  async function handleFileInputChange() {
    const files = Array.from(fileInputRef.current?.files || []).slice(0, 5);
    if (fileActionRef.current === 'replace') {
      if (files.length > 1) {
        setProcessing(true);
        setPreviewLoaded(false);
        try {
          const newUrls: string[] = [];
          for (const f of files) {
            try {
              const url = await compressImage(f);
              newUrls.push(url);
            } catch (e) {
              console.error('Failed to process one of replacement files', e);
            }
          }
          if (newUrls.length) {
            const next = newUrls.slice(0, 5);
            setDataUrls(next);
            setOriginalDataUrls(next.slice());
            setEditorSettings(next.map(() => ({})));
            try { setCompressedSize(approxDataUrlBytes(next[0])); } catch (_) {}
            try { setOriginalSize(files[0].size); } catch (_) {}
          }
        } finally {
          setProcessing(false);
        }
      } else {
        const f = files[0];
        if (f) {
          setProcessing(true);
          try {
            const url = await compressImage(f);
            const bytes = approxDataUrlBytes(url);
            setCompressedSize(bytes);
            const replaceAt = replaceIndexRef.current ?? (dataUrls.length ? index : 0);
              if (dataUrls.length) {
              const safeReplaceAt = Math.min(replaceAt, dataUrls.length - 1);
              setDataUrls(d => {
                const copy = [...d];
                copy[safeReplaceAt] = url;
                return copy;
              });
              setOriginalDataUrls(d => {
                const copy = [...d];
                copy[safeReplaceAt] = url;
                return copy;
              });
              setEditorSettings(s => {
                const copy = [...s];
                copy[safeReplaceAt] = {};
                return copy;
              });
              if (safeReplaceAt === 0) { setPreviewLoaded(false); }
            } else {
              setDataUrls([url]);
              setOriginalDataUrls([url]);
              setEditorSettings([{}]);
              setPreviewLoaded(false);
            }
            setOriginalSize(approxDataUrlBytes(f as any));
          } catch (e) {
            console.error(e);
            toast.show('Failed to process replacement image');
          } finally {
            setProcessing(false);
          }
        }
      }
      fileActionRef.current = 'append';
      replaceIndexRef.current = null;
    } else {
      if (!files.length) return;
      setProcessing(true);
      setPreviewLoaded(false);
      try {
        const newUrls: string[] = [];
        for (const f of files) {
          try {
            const url = await compressImage(f);
            newUrls.push(url);
          } catch (e) {
            console.error('Failed to process one of selected files', e);
          }
        }
        if (!newUrls.length) return;
        setDataUrls(d => {
          const next = [...d, ...newUrls].slice(0, 5);
          return next;
        });
        setOriginalDataUrls(d => {
          const next = [...d, ...newUrls].slice(0, 5);
          return next;
        });
        setEditorSettings(s => {
          const next = [...s, ...newUrls.map(() => ({}))].slice(0, 5);
          return next;
        });
        setIndex(Math.min(dataUrls.length + newUrls.length - 1, 4)); // Auto-select the last added photo
        setPreviewLoaded(false);
        try { setCompressedSize(approxDataUrlBytes(newUrls[0])); } catch (_) {}
        try { setOriginalSize(files[0].size); } catch (_) {}
      } finally {
        setProcessing(false);
      }
    }
  }

  return {
    handleFile,
    handleFileInputChange,
  };
}