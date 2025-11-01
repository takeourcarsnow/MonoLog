"use client";

import { CONFIG } from "@/src/lib/config";

interface SizeWarningProps {
  compressedSize: number | null;
}

export function SizeWarning({ compressedSize }: SizeWarningProps) {
  if (compressedSize == null || compressedSize <= CONFIG.imageMaxSizeMB * 1024 * 1024) {
    return null;
  }

  return (
    <div className="warn" style={{ marginTop: 8 }}>
      Compressed image exceeds the maximum of {CONFIG.imageMaxSizeMB} MB. Please resize or choose a smaller file.
    </div>
  );
}