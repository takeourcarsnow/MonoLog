// Cache for WebGL processed images
export const webglCache = new Map<string, HTMLCanvasElement>();

// Cache for processed inner masks
export const frameInnerMaskCache = new Map<string, HTMLCanvasElement>();

// Cache for frame inner bounds
export const frameBoundsCache = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();