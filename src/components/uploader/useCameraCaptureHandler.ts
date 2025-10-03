import { compressImage, approxDataUrlBytes } from "@/lib/image";

interface UseCameraCaptureHandlerProps {
  dataUrls: string[];
  index: number;
  setDataUrls: React.Dispatch<React.SetStateAction<string[]>>;
  setOriginalDataUrls: React.Dispatch<React.SetStateAction<string[]>>;
  setEditorSettings: React.Dispatch<React.SetStateAction<any[]>>;
  setDataUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setPreviewLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  setCompressedSize: React.Dispatch<React.SetStateAction<number | null>>;
  setOriginalSize: React.Dispatch<React.SetStateAction<number | null>>;
  setProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  fileActionRef: React.MutableRefObject<'append' | 'replace'>;
  replaceIndexRef: React.MutableRefObject<number | null>;
  videoRef: React.RefObject<HTMLVideoElement>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  setCameraOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toast: any;
  handleFile: (file: File) => Promise<void>;
}

export function useCameraCaptureHandler({
  dataUrls,
  index,
  setDataUrls,
  setOriginalDataUrls,
  setEditorSettings,
  setDataUrl,
  setPreviewLoaded,
  setCompressedSize,
  setOriginalSize,
  setProcessing,
  fileActionRef,
  replaceIndexRef,
  videoRef,
  streamRef,
  setCameraOpen,
  toast,
  handleFile
}: UseCameraCaptureHandlerProps) {
  const onCameraCapture = async () => {
    const v = videoRef.current;
    const s = streamRef.current;
    if (!v || !s) return;
    setProcessing(true); // Show loader while capturing
    try {
      const w = v.videoWidth || v.clientWidth;
      const h = v.videoHeight || v.clientHeight || Math.round(w * 0.75);
      const cnv = document.createElement('canvas');
      cnv.width = w; cnv.height = h;
      const ctx = cnv.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');
      ctx.drawImage(v, 0, 0, w, h);
      // convert to blob and call handleFile
      cnv.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
        // if replacing, handle specially
        if (fileActionRef.current === 'replace') {
          try {
            const url = await compressImage(file);
            const bytes = approxDataUrlBytes(url);
            setCompressedSize(bytes);
            const replaceAt = replaceIndexRef.current ?? (dataUrls.length ? index : 0);
            if (dataUrls.length) {
              setDataUrls(d => {
                const copy = [...d];
                copy[replaceAt] = url;
                return copy;
              });
              // also update the original
              setOriginalDataUrls(d => {
                const copy = [...d];
                copy[replaceAt] = url;
                return copy;
              });
              // reset settings for replaced image
              setEditorSettings(s => {
                const copy = [...s];
                copy[replaceAt] = {};
                return copy;
              });
              if (replaceAt === 0) { setDataUrl(url); setPreviewLoaded(false); }
            } else {
              setDataUrl(url);
              setPreviewLoaded(false);
              setDataUrls([url]);
              setOriginalDataUrls([url]);
              setEditorSettings([{}]);
            }
            setOriginalSize(approxDataUrlBytes(file as any));
            fileActionRef.current = 'append';
            replaceIndexRef.current = null;
          } catch (e) {
            console.error(e);
            toast.show('Failed to process captured image');
          } finally {
            setProcessing(false);
          }
        } else {
          await handleFile(file);
        }
        try { s.getTracks().forEach(t => t.stop()); } catch (_) {}
        streamRef.current = null;
        setCameraOpen(false);
      }, 'image/jpeg', 0.92);
    } catch (e) {
      console.error(e);
      toast.show('Failed to capture photo');
      setProcessing(false);
    }
  };

  return { onCameraCapture };
}