// map names to same FILTER_PRESETS fragments used elsewhere
export function getPresetCSSFilter(name?: string): string {
  if (!name) return '';
  switch (name) {
    case 'invert': return 'invert(1)';
    case 'portra': return 'contrast(1.2) brightness(1.1) saturate(1.1) sepia(0.1) hue-rotate(-5deg)';
    case 'velvia': return 'contrast(1.15) saturate(1.3) brightness(0.95)';
    case 'trix': return 'grayscale(1) contrast(1.5) brightness(0.9)';
    case 'hp5': return 'grayscale(1) contrast(1.4) brightness(0.95) sepia(0.2)';
    case 'provia': return 'contrast(1.1) saturate(1.05) brightness(1.02)';
    case 'ektar': return 'contrast(1.2) saturate(1.4) brightness(0.95)';
    case 'astia': return 'contrast(1.1) saturate(1.15) brightness(1.08) sepia(0.1)';
    case 'ektachrome': return 'contrast(1.3) saturate(1.6) brightness(0.88) hue-rotate(12deg)';
    case 'delta': return 'grayscale(1) contrast(1.4) brightness(0.8)';
    case 'gold': return 'contrast(1.2) saturate(1.25) brightness(1.05) sepia(0.12)';
    case 'scala': return 'grayscale(1) contrast(1.7) brightness(0.92)';
    case 'fp4': return 'grayscale(1) contrast(1.2) brightness(0.95)';
    case 'tmax': return 'grayscale(1) contrast(1.3) brightness(0.9)';
    case 'panatomic': return 'grayscale(1) contrast(1.1) brightness(1.0)';
    default: return '';
  }
}

// preset mapping to numeric id
export function getPresetId(name: string): number {
  switch (name) {
    case 'invert': return 1;
    case 'portra': return 2;
    case 'velvia': return 3;
    case 'trix': return 4;
    case 'hp5': return 5;
    case 'provia': return 6;
    case 'ektar': return 7;
    case 'astia': return 8;
    case 'ektachrome': return 9;
    case 'delta': return 10;
    case 'gold': return 11;
    case 'scala': return 12;
    case 'fp4': return 13;
    case 'tmax': return 14;
    case 'panatomic': return 15;
    default: return 0;
  }
}