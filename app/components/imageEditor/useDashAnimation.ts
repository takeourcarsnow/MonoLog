import { useEffect } from 'react';

export function useDashAnimation(
  sel: { x: number; y: number; w: number; h: number } | null,
  dashOffsetRef: React.MutableRefObject<number>,
  dashAnimRef: React.MutableRefObject<number | null>,
  draw: () => void
) {
  // Animate dashed selection while a selection exists
  useEffect(() => {
    let lastDraw = 0;
    function step(timestamp: number) {
      dashOffsetRef.current = (dashOffsetRef.current - 0.8) % 1000;
      // Throttle draw calls to every ~50ms to reduce performance impact
      if (timestamp - lastDraw > 50) {
        draw();
        lastDraw = timestamp;
      }
      dashAnimRef.current = requestAnimationFrame(step);
    }
    if (sel) {
      if (dashAnimRef.current == null) dashAnimRef.current = requestAnimationFrame(step);
    } else {
      if (dashAnimRef.current != null) {
        cancelAnimationFrame(dashAnimRef.current);
        dashAnimRef.current = null;
        dashOffsetRef.current = 0;
        draw();
      }
    }
    return () => {
      if (dashAnimRef.current != null) cancelAnimationFrame(dashAnimRef.current);
      dashAnimRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);
}
