import { useEffect, useState } from "react";
import { PHRASES } from "./constants";

export function useTypingAnimation(caption: string, isActive: boolean = true) {
  // rotating caption placeholder (persisted across reloads so users see a different prompt each time)
  // Initialize from localStorage so the rotated prompt appears immediately on first render.
  const [placeholder, setPlaceholder] = useState<string>(() => {
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

  // typed text for the JS-driven typing/backspace animation
  const [typed, setTyped] = useState<string>("");

  // Typing/backspace loop: types a phrase, pauses, deletes it, then moves to the next phrase.
  // It runs until the user starts typing into the caption input (caption !== "").
  useEffect(() => {
    let mounted = true;
    const key = "monolog:captionPlaceholderIndex";

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const typeSpeed = 40;
    const deleteSpeed = 28;
    const pauseAfterType = 900;
    const pauseBetween = 420;

    // stop immediately if user started typing or not active
    if (caption && caption.length > 0 || !isActive) {
      setTyped("");
      return;
    }

    (async () => {
      let idx = 0;
      try {
        const raw = localStorage.getItem(key);
        idx = Number.isFinite(Number(raw)) ? Number(raw) : 0;
      } catch (e) {}

      while (mounted && (!caption || caption.length === 0) && isActive) {
        const msg = PHRASES[idx % PHRASES.length] || PHRASES[0];

        // type forward
        for (let i = 1; i <= msg.length; i++) {
          if (!mounted || (caption && caption.length > 0) || !isActive) return;
          setTyped(msg.slice(0, i));
          await sleep(typeSpeed + (i % 3 === 0 ? 8 : 0));
        }

        if (!mounted || (caption && caption.length > 0) || !isActive) break;
        await sleep(pauseAfterType);

        // delete
        for (let i = msg.length; i >= 0; i--) {
          if (!mounted || (caption && caption.length > 0) || !isActive) return;
          setTyped(msg.slice(0, i));
          await sleep(deleteSpeed + (i % 2 === 0 ? 4 : 0));
        }

        // advance and persist
        idx = (idx + 1) % PHRASES.length;
        try { localStorage.setItem(key, String(idx)); } catch (e) {}
        await sleep(pauseBetween);
      }

      if (mounted) setTyped("");
    })();

    return () => { mounted = false; };
  }, [caption]);

  return { placeholder, typed };
}
