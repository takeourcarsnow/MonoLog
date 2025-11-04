import { useState } from "react";
import { compressImage, approxDataUrlBytes } from "@/lib/image";

export function useFileHandling() {
  const [processing, setProcessing] = useState(false);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);

  const handleFile = async (
    file: File,
    onSuccess: (url: string, compressedBytes: number, originalBytes: number) => void
  ) => {
    if (!file.type.startsWith("image/")) {
      console.warn("Please select an image file");
      return;
    }
    setProcessing(true);
    setOriginalSize(file.size);
    setCompressedSize(null);
    try {
      const url = await compressImage(file);
      const bytes = approxDataUrlBytes(url);
      setCompressedSize(bytes);
      onSuccess(url, bytes, file.size);
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  return { processing, compressedSize, originalSize, handleFile };
}
