"use client";

import { Download } from 'lucide-react';
import { preloadOverlayThumbnails } from '../../imageEditor/overlaysPreload';
import { EditorSettings } from '../../imageEditor/types';

interface PhotoActionRowProps {
  hasPreview: boolean;
  editing: boolean;
  processing: boolean;
  dataUrls: string[];
  originalDataUrls: string[];
  editorSettings: EditorSettings[];
  index: number;
  fileActionRef: React.MutableRefObject<'append' | 'replace'>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onEdit: () => void;
  onRemove: (index: number) => void;
  onAddPhotos: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}

export function PhotoActionRow({
  hasPreview,
  editing,
  processing,
  dataUrls,
  originalDataUrls,
  editorSettings,
  index,
  fileActionRef,
  fileInputRef,
  onEdit,
  onRemove,
  onAddPhotos,
  onMoveLeft,
  onMoveRight,
}: PhotoActionRowProps) {
  const handleDownload = () => {
    try {
      const url = (dataUrls[index] || originalDataUrls[index] || dataUrls[0] || originalDataUrls[0]) as string | undefined;
      if (!url) return;
      const link = document.createElement('a');
      link.href = url;
      const now = new Date();
      const yyyy = String(now.getFullYear());
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const filename = `monolog_${yyyy}${mm}${dd}.jpg`;
      link.download = filename;
      link.click();
    } catch (e) {
      console.error('Download failed', e);
    }
  };

  if (!hasPreview || editing) {
    return null;
  }

  return (
    <div className="photo-action-row">
      {dataUrls.length > 1 && (
        <button
          type="button"
          className="btn icon ghost small-min"
          aria-label="Move photo left"
          onClick={onMoveLeft}
          disabled={processing || index === 0}
          title="Move photo left"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
      )}
      <button
        type="button"
        className="btn icon ghost small-min"
        aria-label="Add photos"
        onClick={onAddPhotos}
        disabled={processing || dataUrls.length >= 5}
        title={dataUrls.length >= 5 ? "Maximum 5 photos allowed" : "Add photos"}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <path d="M12 5v14"/>
          <path d="M5 12h14"/>
        </svg>
      </button>
      <button
        className="btn icon ghost small-min"
        aria-label="Edit photo"
        onClick={async () => {
          try { await preloadOverlayThumbnails(); } catch {}
          onEdit();
        }}
        disabled={processing}
        title="Edit photo"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button
        type="button"
        className="btn icon ghost small-min"
        aria-label="Download photo"
        title="Download photo"
        onClick={handleDownload}
        disabled={processing}
      >
        <Download size={18} aria-hidden />
      </button>
      <button
        type="button"
        className="btn icon ghost small-min"
        aria-label="Remove photo"
        onClick={() => {
          if (processing) return;
          onRemove(index);
        }}
        disabled={processing}
        title="Remove photo"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <path d="M3 6h18"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      </button>
      {dataUrls.length > 1 && (
        <button
          type="button"
          className="btn icon ghost small-min"
          aria-label="Move photo right"
          onClick={onMoveRight}
          disabled={processing || index === dataUrls.length - 1}
          title="Move photo right"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      )}
    </div>
  );
}