import { useState } from "react";
import { PHRASES } from "./constants";

export function useTypingAnimation(_caption: string, _isActive: boolean = true) {
  // Return a single, rotated placeholder string. Be defensive:
  // - Parse the stored index with parseInt to avoid odd Number(null) behavior
  // - If storage is unavailable or malformed, fall back to a random prompt
  // - Persist the next index for subsequent visits
  const [placeholder, setPlaceholder] = useState<string>(() => {
    const key = "monolog:captionPlaceholderIndex";
    try {
      const raw = localStorage.getItem(key);
      let idx = -1;
      if (raw !== null) {
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed) && Number.isFinite(parsed)) idx = parsed;
      }

      // If idx is invalid, choose a random starting point so users don't
      // always see the same phrase in restricted environments.
      if (idx < 0 || idx >= PHRASES.length) {
        idx = Math.floor(Math.random() * PHRASES.length);
      }

      // advance to next index and persist
      const next = (idx + 1) % PHRASES.length;
      try { localStorage.setItem(key, String(next)); } catch (_) {}
      // setPlaceholder to the chosen index value (next)
      return PHRASES[next];
    } catch (e) {
      // If anything goes wrong, pick a random phrase so UI isn't stuck.
      return PHRASES[Math.floor(Math.random() * PHRASES.length)];
    }
  });

  // We also want to expose the initial index (best-effort) so callers can
  // implement in-page rotation. Compute it from the placeholder value.
  const startIndex = PHRASES.indexOf(placeholder);
  return { placeholder, startIndex, setPlaceholder } as const;
}
