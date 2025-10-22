export function handleCropResize(
  dragging: {
    startX: number;
    startY: number;
    mode: "pan" | "crop";
    action?: "move" | "draw" | "resize";
    origSel?: { x: number; y: number; w: number; h: number };
    anchorX?: number;
    anchorY?: number;
    handleIndex?: number;
    moved?: boolean;
  },
  p: { x: number; y: number },
  imgRect: { x: number; y: number; w: number; h: number },
  cropRatio: React.MutableRefObject<number | null>,
  setSel: (sel: { x: number; y: number; w: number; h: number } | null) => void
) {
  const handleIndex = dragging.handleIndex!;
  const dx = p.x - dragging.startX;
  const dy = p.y - dragging.startY;
  let newSel = { ...dragging.origSel! };
  if (handleIndex === 0) { // top-left
    newSel.x += dx;
    newSel.y += dy;
    newSel.w -= dx;
    newSel.h -= dy;
  } else if (handleIndex === 1) { // top-right
    newSel.y += dy;
    newSel.w += dx;
    newSel.h -= dy;
  } else if (handleIndex === 2) { // bottom-left
    newSel.x += dx;
    newSel.w -= dx;
    newSel.h += dy;
  } else if (handleIndex === 3) { // bottom-right
    newSel.w += dx;
    newSel.h += dy;
  } else if (handleIndex === 4) { // top
    newSel.y += dy;
    newSel.h -= dy;
  } else if (handleIndex === 5) { // bottom
    newSel.h += dy;
  } else if (handleIndex === 6) { // left
    newSel.x += dx;
    newSel.w -= dx;
  } else if (handleIndex === 7) { // right
    newSel.w += dx;
  }
  // Ensure w and h are positive
  if (newSel.w < 1) newSel.w = 1;
  if (newSel.h < 1) newSel.h = 1;
  // Maintain aspect ratio if set: enforce exact ratio and keep the handle anchor fixed
  if (cropRatio.current) {
    const ratio = cropRatio.current; // width / height
    // determine new width/height based on handle type
    let adjW = newSel.w;
    let adjH = newSel.h;
    if (handleIndex < 4) {
      // corners: base on the larger change to feel natural
      const dw = Math.abs(newSel.w - dragging.origSel!.w);
      const dh = Math.abs(newSel.h - dragging.origSel!.h);
      if (dw > dh) {
        adjH = Math.max(1, adjW / ratio);
      } else {
        adjW = Math.max(1, adjH * ratio);
      }
    } else if (handleIndex === 4 || handleIndex === 5) {
      // top/bottom edges: base on height
      adjH = Math.max(1, adjH);
      adjW = Math.max(1, adjH * ratio);
    } else {
      // left/right edges: base on width
      adjW = Math.max(1, adjW);
      adjH = Math.max(1, adjW / ratio);
    }

    // recompute x/y so the opposite edge stays anchored
    const orig = dragging.origSel!;
    // compute anchor (the fixed point) based on which handle is dragged
    let anchorX = orig.x; let anchorY = orig.y;
    if (handleIndex === 0) { anchorX = orig.x + orig.w; anchorY = orig.y + orig.h; }
    else if (handleIndex === 1) { anchorX = orig.x; anchorY = orig.y + orig.h; }
    else if (handleIndex === 2) { anchorX = orig.x + orig.w; anchorY = orig.y; }
    else if (handleIndex === 3) { anchorX = orig.x; anchorY = orig.y; }
    else if (handleIndex === 4) { anchorX = orig.x + orig.w / 2; anchorY = orig.y + orig.h; }
    else if (handleIndex === 5) { anchorX = orig.x + orig.w / 2; anchorY = orig.y; }
    else if (handleIndex === 6) { anchorX = orig.x + orig.w; anchorY = orig.y + orig.h / 2; }
    else if (handleIndex === 7) { anchorX = orig.x; anchorY = orig.y + orig.h / 2; }

    // available space from the anchor to image rect edges
    const availLeft = anchorX - imgRect.x;
    const availRight = imgRect.x + imgRect.w - anchorX;
    const availTop = anchorY - imgRect.y;
    const availBottom = imgRect.y + imgRect.h - anchorY;
    // choose horizontal/vertical available depending on which side the anchor is on
    const availableW = (anchorX > orig.x) ? availLeft : availRight;
    const availableH = (anchorY > orig.y) ? availTop : availBottom;
    // Ensure adjW/adjH fit within available area while preserving ratio
    // Compute max width allowed by availableH and ratio
    const maxWFromH = Math.max(1, availableH * ratio);
    const maxAllowedW = Math.max(1, Math.min(availableW, maxWFromH));
    if (adjW > maxAllowedW) {
      adjW = maxAllowedW;
      adjH = Math.max(1, adjW / ratio);
    }
    // Also ensure adjH fits availableH (in case horizontal wasn't limiting)
    const maxHFromW = Math.max(1, availableW / ratio);
    const maxAllowedH = Math.max(1, Math.min(availableH, maxHFromW));
    if (adjH > maxAllowedH) {
      adjH = maxAllowedH;
      adjW = Math.max(1, adjH * ratio);
    }
    switch (handleIndex) {
      case 0: // top-left - anchor bottom-right
        newSel.x = orig.x + orig.w - adjW;
        newSel.y = orig.y + orig.h - adjH;
        newSel.w = adjW; newSel.h = adjH;
        break;
      case 1: // top-right - anchor bottom-left
        newSel.x = orig.x;
        newSel.y = orig.y + orig.h - adjH;
        newSel.w = adjW; newSel.h = adjH;
        break;
      case 2: // bottom-left - anchor top-right
        newSel.x = orig.x + orig.w - adjW;
        newSel.y = orig.y;
        newSel.w = adjW; newSel.h = adjH;
        break;
      case 3: // bottom-right - anchor top-left
        newSel.x = orig.x;
        newSel.y = orig.y;
        newSel.w = adjW; newSel.h = adjH;
        break;
      case 4: // top edge - anchor bottom
        newSel.x = orig.x + (orig.w - adjW) / 2;
        newSel.y = orig.y + orig.h - adjH;
        newSel.w = adjW; newSel.h = adjH;
        break;
      case 5: // bottom edge - anchor top
        newSel.x = orig.x + (orig.w - adjW) / 2;
        newSel.y = orig.y;
        newSel.w = adjW; newSel.h = adjH;
        break;
      case 6: // left edge - anchor right
        newSel.x = orig.x + orig.w - adjW;
        newSel.y = orig.y + (orig.h - adjH) / 2;
        newSel.w = adjW; newSel.h = adjH;
        break;
      case 7: // right edge - anchor left
        newSel.x = orig.x;
        newSel.y = orig.y + (orig.h - adjH) / 2;
        newSel.w = adjW; newSel.h = adjH;
        break;
    }
  }
  // Clamp to image rect (ensure selection stays inside image)
  newSel.x = Math.max(imgRect.x, Math.min(newSel.x, imgRect.x + imgRect.w - newSel.w));
  newSel.y = Math.max(imgRect.y, Math.min(newSel.y, imgRect.y + imgRect.h - newSel.h));
  newSel.w = Math.min(newSel.w, Math.max(1, imgRect.x + imgRect.w - newSel.x));
  newSel.h = Math.min(newSel.h, Math.max(1, imgRect.y + imgRect.h - newSel.y));
  setSel(newSel);
}