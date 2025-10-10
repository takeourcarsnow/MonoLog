// authHooks.ts
import { useState, useRef, useEffect } from "react";

export type HeaderNotice = {
  title: string;
  subtitle?: string;
  variant?: 'info' | 'warn' | 'error' | 'success';
};

export function useHeaderNotice() {
  const [headerNotice, setHeaderNotice] = useState<HeaderNotice | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const [headerNoticePhase, setHeaderNoticePhase] = useState<'enter' | 'exit'>('enter');

  function showHeaderNotice(payload: HeaderNotice, ttl = 4000) {
    // clear existing timers
    try { if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current); } catch (_) {}
    try { if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current); } catch (_) {}

    const exitDuration = 420; // match CSS exit animation duration

    if (headerNotice) {
      // If a notice is already visible, play its exit animation first,
      // then set the new payload and play enter. This avoids instant swap.
      setHeaderNoticePhase('exit');
      exitTimerRef.current = window.setTimeout(() => {
        // replace the notice and restart the lifecycle
        setHeaderNotice(payload);
        setHeaderNoticePhase('enter');
        // schedule removal after ttl
        noticeTimerRef.current = window.setTimeout(() => {
          setHeaderNoticePhase('exit');
          exitTimerRef.current = window.setTimeout(() => {
            setHeaderNotice(null);
            exitTimerRef.current = null;
          }, exitDuration) as unknown as number;
          noticeTimerRef.current = null;
        }, ttl) as unknown as number;
        exitTimerRef.current = null;
      }, exitDuration) as unknown as number;
      return;
    }

    // No existing notice: show immediately and schedule exit
    setHeaderNotice(payload);
    setHeaderNoticePhase('enter');
    // schedule exit -> removal so we get the exit animation to run
    noticeTimerRef.current = window.setTimeout(() => {
      // trigger exit phase
      setHeaderNoticePhase('exit');
      exitTimerRef.current = window.setTimeout(() => {
        setHeaderNotice(null);
        exitTimerRef.current = null;
      }, exitDuration) as unknown as number;
      noticeTimerRef.current = null;
    }, ttl) as unknown as number;
  }

  // cleanup timers on unmount to avoid setState after unmount
  useEffect(() => {
    return () => {
      try { if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current); } catch (_) {}
      try { if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current); } catch (_) {}
    };
  }, []);

  return { headerNotice, headerNoticePhase, showHeaderNotice, setHeaderNotice };
}