export type EditorSettings = {
  exposure?: number;
  contrast?: number;
  saturation?: number;
  temperature?: number;
  vignette?: number;
  rotation?: number;
  frameColor?: 'white' | 'black';
  frameThickness?: number;
  selectedFilter?: string;
  filterStrength?: number;
  grain?: number;
  softFocus?: number;
  fade?: number;
  overlay?: { img: HTMLImageElement; blendMode: string; opacity: number };
  frameOverlay?: { img: HTMLImageElement; opacity: number };
};

export type ImageEditorProps = {
  initialDataUrl: string;
  initialSettings?: EditorSettings;
  onCancel: () => void;
  onApply: (dataUrl: string, settings: EditorSettings) => void;
};
