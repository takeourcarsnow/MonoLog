'use client';

import { useOverscrollRubberband } from './useOverscrollRubberband';

/**
 * OverscrollRubberband component - Rebuilt from scratch
 * Adds iOS-style rubber band effect ONLY to feed and explore content areas
 * Does NOT affect navbar, header, or horizontal swiping between views
 */
export function OverscrollRubberband() {
  useOverscrollRubberband();

  return null;
}
