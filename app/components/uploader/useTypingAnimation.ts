import { useState } from "react";
import { PHRASES } from "./constants";

export function useTypingAnimation(_caption: string, _isActive: boolean = true) {
  // Return a single, rotated placeholder string and avoid JS-driven live
  // typing updates that trigger frequent re-renders and can steal focus.
  const [placeholder] = useState<string>(() => {
    const key = "monolog:captionPlaceholderIndex";
    try {
      const raw = localStorage.getItem(key);
      let idx = Number.isFinite(Number(raw)) ? Number(raw) : -1;
      idx = (idx + 1) % PHRASES.length;
      localStorage.setItem(key, String(idx));
      return PHRASES[idx];
    } catch (e) {
      return PHRASES[0];
    }
  });

  return { placeholder };
}
