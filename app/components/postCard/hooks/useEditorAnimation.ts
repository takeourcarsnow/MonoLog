import { useState, useRef, useEffect } from 'react';

export const useEditorAnimation = (editing: boolean) => {
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [editorAnim, setEditorAnim] = useState<'enter' | 'exit' | null>(null);
  const [opening, setOpening] = useState<boolean>(false);
  const editorWrapRef = useRef<HTMLDivElement | null>(null);
  const exitTimerRef = useRef<number | null>(null);
  const lastOpenAtRef = useRef<number | null>(null);
  const pendingCloseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Use RAF to coordinate DOM reads/writes so the wrapper mounts collapsed
    // and then we expand it to the measured height. For exit we set the
    // starting height and then collapse to 0 to animate out smoothly.
    let rafId: number | undefined;
    function runExit() {
      const el = editorWrapRef.current;
      if (el) {
        el.style.maxHeight = `${el.scrollHeight}px`;
        rafId = requestAnimationFrame(() => {
          setEditorAnim('exit');
          if (el) el.style.maxHeight = '0px';
          if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
          exitTimerRef.current = window.setTimeout(() => {
            if (editorWrapRef.current) editorWrapRef.current.style.maxHeight = '';
            setShowEditor(false);
            setEditorAnim(null);
            exitTimerRef.current = null;
          }, 360);
        }) as unknown as number;
      } else {
        setEditorAnim('exit');
        if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = window.setTimeout(() => { setShowEditor(false); setEditorAnim(null); exitTimerRef.current = null; }, 360);
      }
      setOpening(false);
    }

    if (editing && !showEditor) {
      setShowEditor(true);
      setOpening(true);
      lastOpenAtRef.current = Date.now();
      rafId = requestAnimationFrame(() => {
        const el = editorWrapRef.current;
        if (el) {
          // Ensure we start from 0 so the transition to the measured height animates
          el.style.maxHeight = '0px';
          // Force layout then set to scrollHeight
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          el.offsetHeight;
          el.style.maxHeight = `${el.scrollHeight}px`;
        }
        setEditorAnim('enter');
      }) as unknown as number;
    } else if (!editing && showEditor) {
      const now = Date.now();
      const last = lastOpenAtRef.current || 0;
      const sinceOpen = now - last;
      const MIN_OPEN_MS = 300;
      if (sinceOpen < MIN_OPEN_MS) {
        // Schedule the real exit after remaining time
        // avoid accidental immediate closes (debounce short flaps).
        if (pendingCloseTimerRef.current) window.clearTimeout(pendingCloseTimerRef.current);
        pendingCloseTimerRef.current = window.setTimeout(() => {
          pendingCloseTimerRef.current = null;
          runExit();
        }, MIN_OPEN_MS - sinceOpen);
      } else {
        runExit();
      }
    }
    return () => {
      if (typeof rafId !== 'undefined') cancelAnimationFrame(rafId as unknown as number);
      if (pendingCloseTimerRef.current) { window.clearTimeout(pendingCloseTimerRef.current); pendingCloseTimerRef.current = null; }
      if (exitTimerRef.current) { window.clearTimeout(exitTimerRef.current); exitTimerRef.current = null; }
    };
  }, [editing, showEditor]);

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    // Only act when the max-height or opacity transition finishes on the wrapper
    if (editorAnim === 'exit' && (e.propertyName === 'max-height' || e.propertyName === 'opacity')) {
      // finished closing -> unmount
      if (editorWrapRef.current) editorWrapRef.current.style.maxHeight = '';
      setShowEditor(false);
      setEditorAnim(null);
      if (exitTimerRef.current) { window.clearTimeout(exitTimerRef.current); exitTimerRef.current = null; }
    }
    if (editorAnim === 'enter' && (e.propertyName === 'max-height' || e.propertyName === 'opacity')) {
      // finished opening -> clear any inline maxHeight so layout can be natural
      if (editorWrapRef.current) editorWrapRef.current.style.maxHeight = '';
      setEditorAnim(null);
    }
  };

  return {
    showEditor,
    editorAnim,
    opening,
    editorWrapRef,
    handleTransitionEnd
  };
};