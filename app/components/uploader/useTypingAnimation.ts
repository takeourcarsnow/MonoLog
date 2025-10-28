import { useState } from "react";

export function useTypingAnimation(_caption: string | undefined, _isActive: boolean = true, phrases: string[] = []) {
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
      if (idx < 0 || idx >= phrases.length) {
        idx = Math.floor(Math.random() * phrases.length);
      }

      // advance to next index and persist
      const next = (idx + 1) % phrases.length;
      try { localStorage.setItem(key, String(next)); } catch (_) {}
      // setPlaceholder to the chosen index value (next)
      return phrases[next];
    } catch (e) {
      // If anything goes wrong, pick a random phrase so UI isn't stuck.
      return phrases[Math.floor(Math.random() * phrases.length)];
    }
  });

  // We also want to expose the initial index (best-effort) so callers can
  // implement in-page rotation. Compute it from the placeholder value.
  const startIndex = phrases.indexOf(placeholder);
  return { placeholder, startIndex, setPlaceholder } as const;
}
