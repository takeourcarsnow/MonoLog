import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useCountdown() {
  const [canPost, setCanPost] = useState<boolean | null>(null);
  const [nextAllowedAt, setNextAllowedAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<string>("");
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [countdownTotalMs, setCountdownTotalMs] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const can = await api.canPostToday();
      setCanPost(can.allowed);
      // Prefer server-provided nextAllowedAt/lastPostedAt which encode the calendar-day window.
      if (!can.allowed) {
        const next = can.nextAllowedAt ?? null;
        const last = (can as any).lastPostedAt ?? null;
        if (next && last) {
          setNextAllowedAt(next);
          // total window is from lastPostedAt -> nextAllowedAt (usually less than 24h depending on post time)
          setCountdownTotalMs(Math.max(0, next - last));
          try { localStorage.setItem('monolog:nextAllowedAt', String(next)); localStorage.setItem('monolog:lastPostedAt', String(last)); } catch (e) {}
        } else if (next) {
          // fallback: we only have nextAllowedAt (server chose to provide it). Assume full 24h for progress visuals.
          const COOLDOWN_TOTAL_MS = 24 * 60 * 60 * 1000;
          setNextAllowedAt(next);
          setCountdownTotalMs(COOLDOWN_TOTAL_MS);
          try { localStorage.setItem('monolog:nextAllowedAt', String(next)); localStorage.removeItem('monolog:lastPostedAt'); } catch (e) {}
        } else {
          // No timing info provided; fall back to a full-24h window starting now
          const COOLDOWN_TOTAL_MS = 24 * 60 * 60 * 1000;
          const assumedNext = Date.now() + COOLDOWN_TOTAL_MS;
          setNextAllowedAt(assumedNext);
          setCountdownTotalMs(COOLDOWN_TOTAL_MS);
          try { localStorage.setItem('monolog:nextAllowedAt', String(assumedNext)); localStorage.removeItem('monolog:lastPostedAt'); } catch (e) {}
        }
      } else {
        // clear any stored value if allowed
        try { localStorage.removeItem('monolog:nextAllowedAt'); localStorage.removeItem('monolog:lastPostedAt'); } catch (e) {}
        setCountdownTotalMs(null);
        setNextAllowedAt(null);
      }
    })();
  }, []);

  // update remaining countdown every second when nextAllowedAt is known
  useEffect(() => {
    // Try to read persisted values if missing
    let initial = nextAllowedAt;
    let lastPosted = null as number | null;
    if (!initial) {
      try { const stored = localStorage.getItem('monolog:nextAllowedAt'); if (stored) initial = Number(stored); } catch (e) {}
    }
    try { const storedLast = localStorage.getItem('monolog:lastPostedAt'); if (storedLast) lastPosted = Number(storedLast); } catch (e) {}
    if (!initial) return;

    function fmt(ms: number) {
      // Display hours, minutes, and seconds for full countdown visibility
      if (ms <= 0) return "0:00:00";
      const totalSeconds = Math.floor(ms / 1000);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${h}:${pad(m)}:${pad(s)}`;
    }

    // Compute remaining and total window. If we have lastPosted, use that to compute a precise total window
    const now = Date.now();
    const ms0 = initial - now;
    const initialTime = fmt(ms0);
    setRemaining(initialTime);
    setRemainingMs(ms0);
    if (lastPosted && !countdownTotalMs) {
      setCountdownTotalMs(Math.max(0, initial - lastPosted));
    }

    const id = setInterval(() => {
      const ms = initial! - Date.now();
      if (ms <= 0) {
        setCanPost(true);
        setNextAllowedAt(null);
        setRemaining("");
        setRemainingMs(null);
        try { localStorage.removeItem('monolog:nextAllowedAt'); localStorage.removeItem('monolog:lastPostedAt'); } catch (e) {}
        clearInterval(id);
        return;
      }
      const newTime = fmt(ms);
      setRemaining(newTime);
      setRemainingMs(ms);
    }, 1000); // update every second

    return () => clearInterval(id);
  }, [nextAllowedAt, countdownTotalMs]);

  return { canPost, nextAllowedAt, remaining, remainingMs, countdownTotalMs };
}