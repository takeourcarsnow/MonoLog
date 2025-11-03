function clamp255(v: number) { return v < 0 ? 0 : v > 255 ? 255 : Math.round(v); }

// Helpers for export-time special effects
function renderProcessedForExport(
  img: HTMLImageElement,
  srcX: number,
  srcY: number,
  srcW: number,
  srcH: number,
  baseFilter: string,
  presetFilter: string,
  filterStrength: number
) {
  // render filtered source (no rotation) to a canvas of srcW x srcH
  const base = document.createElement('canvas'); base.width = Math.max(1, Math.round(srcW)); base.height = Math.max(1, Math.round(srcH));
  const bctx = base.getContext('2d')!;
  if (filterStrength <= 0.001) {
    bctx.filter = baseFilter;
    bctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, base.width, base.height);
    bctx.filter = 'none';
    return base;
  }
  if (filterStrength >= 0.999) {
    bctx.filter = `${baseFilter} ${presetFilter}`.trim();
    bctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, base.width, base.height);
    bctx.filter = 'none';
    return base;
  }
  // blend base + preset
  bctx.filter = baseFilter;
  bctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, base.width, base.height);
  bctx.filter = 'none';
  const filt = document.createElement('canvas'); filt.width = base.width; filt.height = base.height;
  const fctx = filt.getContext('2d')!; fctx.filter = `${baseFilter} ${presetFilter}`.trim();
  fctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, filt.width, filt.height); fctx.filter = 'none';
  bctx.globalAlpha = Math.min(1, Math.max(0, filterStrength));
  bctx.drawImage(filt, 0, 0);
  bctx.globalAlpha = 1;
  return base;
}

export { clamp255, renderProcessedForExport };