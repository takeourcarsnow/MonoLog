import { EditorSettings } from "../imageEditor/types";

export interface PreviewSectionProps {
  dataUrls: string[];
  originalDataUrls: string[];
  editorSettings: EditorSettings[];
  alt: string | string[];
  editing: boolean;
  editingIndex: number;
  setEditingIndex: React.Dispatch<React.SetStateAction<number>>;
  editingAlt: string;
  setAlt: React.Dispatch<React.SetStateAction<string | string[]>>;
  setEditorSettings: React.Dispatch<React.SetStateAction<EditorSettings[]>>;
  setDataUrls: React.Dispatch<React.SetStateAction<string[]>>;
  setOriginalDataUrls: React.Dispatch<React.SetStateAction<string[]>>;
  setPreviewLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  setCompressedSize: React.Dispatch<React.SetStateAction<number | null>>;
  setOriginalSize: React.Dispatch<React.SetStateAction<number | null>>;
  setProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  processing: boolean;
  publishing: boolean;
  previewLoaded: boolean;
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  trackRef: React.RefObject<HTMLDivElement | null>;
  touchStartX: React.MutableRefObject<number | null>;
  touchDeltaX: React.MutableRefObject<number>;
  fileActionRef: React.MutableRefObject<'append' | 'replace'>;
  replaceIndexRef: React.MutableRefObject<number | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  toast: any;
  handleFile: (file: File) => Promise<void>;
}

