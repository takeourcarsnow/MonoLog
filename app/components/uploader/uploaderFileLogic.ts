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
  // Helper: Process files into compressed data URLs
  async function processFilesToUrls(files: File[]): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      try {
        const url = await compressImage(file);
        urls.push(url);
      } catch (e) {
        console.error('Failed to process file', e);
      }
    }
    return urls.slice(0, 5);
  }

  // Helper: Set state for multiple files (append mode)
  function setStateForMultipleAppend(newUrls: string[], files: File[]) {
    setDataUrls(d => [...d, ...newUrls].slice(0, 5));
    setOriginalDataUrls(d => [...d, ...newUrls].slice(0, 5));
    setEditorSettings(s => [...s, ...newUrls.map(() => ({}))].slice(0, 5));
    setIndex(Math.min(dataUrls.length + newUrls.length - 1, 4));
    setPreviewLoaded(false);
    try { setCompressedSize(approxDataUrlBytes(newUrls[0])); } catch (_) {}
    try { setOriginalSize(files[0].size); } catch (_) {}
  }

  // Helper: Set state for multiple files (replace mode)
  function setStateForMultipleReplace(newUrls: string[], files: File[]) {
    setDataUrls(newUrls);
    setOriginalDataUrls(newUrls.slice());
    setEditorSettings(newUrls.map(() => ({})));
    try { setCompressedSize(approxDataUrlBytes(newUrls[0])); } catch (_) {}
    try { setOriginalSize(files[0].size); } catch (_) {}
  }

  // Helper: Set state for single file replacement
  async function setStateForSingleReplace(url: string, file: File, replaceAt: number) {
    const bytes = approxDataUrlBytes(url);
    setCompressedSize(bytes);
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
      if (safeReplaceAt === 0) setPreviewLoaded(false);
    } else {
      setDataUrls([url]);
      setOriginalDataUrls([url]);
      setEditorSettings([{}]);
      setPreviewLoaded(false);
    }
    setOriginalSize(approxDataUrlBytes(file as any));
  }

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
    if (!files.length) return;

    const isReplace = fileActionRef.current === 'replace';
    const isMultiple = files.length > 1;

    setProcessing(true);
    setPreviewLoaded(false);

    try {
      if (isReplace && isMultiple) {
        // Replace with multiple files
        const newUrls = await processFilesToUrls(files);
        if (newUrls.length) {
          setStateForMultipleReplace(newUrls, files);
        }
      } else if (isReplace && !isMultiple) {
        // Replace single file
        const file = files[0];
        if (file) {
          const url = await compressImage(file);
          const replaceAt = replaceIndexRef.current ?? (dataUrls.length ? index : 0);
          await setStateForSingleReplace(url, file, replaceAt);
        }
      } else {
        // Append files
        const newUrls = await processFilesToUrls(files);
        if (newUrls.length) {
          setStateForMultipleAppend(newUrls, files);
        }
      }
    } catch (e) {
      console.error(e);
      toast.show(isReplace ? 'Failed to process replacement image' : 'Failed to process selected files');
    } finally {
      setProcessing(false);
      if (isReplace) {
        fileActionRef.current = 'append';
        replaceIndexRef.current = null;
      }
    }
  }

  return {
    handleFile,
    handleFileInputChange,
  };
}