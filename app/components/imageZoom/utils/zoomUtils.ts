import React from 'react';

export const getBounds = (
  containerRef: React.RefObject<HTMLDivElement>,
  imgRef: React.RefObject<HTMLImageElement>,
  naturalRef: React.MutableRefObject<{ w: number; h: number }>,
  currentScale: number
) => {
  const c = containerRef.current;
  const img = imgRef.current;
  if (!c || !img) return { maxTx: 0, maxTy: 0 };

  const rect = c.getBoundingClientRect();
  const containerW = rect.width;
  const containerH = rect.height;
  const natW = img.naturalWidth || naturalRef.current.w || containerW;
  const natH = img.naturalHeight || naturalRef.current.h || containerH;

  // Calculate the scale factor to fit the image within the container
  const fitScale = Math.min(containerW / natW, containerH / natH);
  const renderedW = natW * fitScale;
  const renderedH = natH * fitScale;

  // When zoomed with transform: scale(scale), the effective size
  const scaledW = renderedW * currentScale;
  const scaledH = renderedH * currentScale;

  const maxTx = Math.max(0, (scaledW - containerW) / 2);
  const maxTy = Math.max(0, (scaledH - containerH) / 2);

  return { maxTx, maxTy };
};