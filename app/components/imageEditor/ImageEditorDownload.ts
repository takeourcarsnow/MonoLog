import { useCallback } from "react";

export function useImageEditorDownload(
  draw: (info?: any, overrides?: any, targetCanvas?: HTMLCanvasElement) => void,
  imgRef: React.RefObject<HTMLImageElement>
) {
  const handleDownload = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.naturalWidth;
    tempCanvas.height = img.naturalHeight;
    draw(null, null, tempCanvas);
    const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
    const link = document.createElement('a');
    link.href = dataUrl;
    // Generate filename with current date and time: monolog_YYYYMMDDHHMM.jpg
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const filename = `monolog_${yyyy}${mm}${dd}_${hh}${min}.jpg`;
    link.download = filename;
    link.click();
  }, [draw, imgRef]);

  return { handleDownload };
}