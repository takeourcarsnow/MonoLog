import Image from "next/image";

interface SingleImageViewProps {
  dataUrl: string | null;
  dataUrls: string[];
  alt: string | string[];
  setEditingIndex: React.Dispatch<React.SetStateAction<number>>;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  processing: boolean;
  fileActionRef: React.MutableRefObject<'append' | 'replace'>;
  replaceIndexRef: React.MutableRefObject<number | null>;
  index: number;
  setDataUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setPreviewLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export function SingleImageView({
  dataUrl,
  dataUrls,
  alt,
  setEditingIndex,
  setEditing,
  processing,
  fileActionRef,
  replaceIndexRef,
  index,
  setDataUrl,
  setPreviewLoaded,
  fileInputRef
}: SingleImageViewProps) {
  return (
    <div>
      {/* Give the image wrapper a definite size so Next/Image with `fill` can render. */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', minHeight: 220 }}>
        <img
          alt={Array.isArray(alt) ? (alt[index] || 'Preview') : (alt || 'Preview')}
          src={(dataUrls.length ? dataUrls[index] : dataUrl) || "/logo.svg"}
          style={{ objectFit: 'contain', width: '100%', height: '100%', display: 'block' }}
          onLoad={() => setPreviewLoaded(true)}
          onError={() => setPreviewLoaded(true)}
        />
      </div>
      { (dataUrl || dataUrls.length === 1) ? (
        <div className="image-actions">
          <button
            className="image-action-btn edit-btn"
            aria-label="Edit photo"
            onClick={() => { setEditingIndex(index); setEditing(true); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            className="image-action-btn change-btn"
            aria-label="Change photo"
            onClick={() => {
              if (processing) return;
              fileActionRef.current = 'replace';
              replaceIndexRef.current = dataUrls.length ? index : 0;
              setEditing(false);
              try {
                if (fileInputRef.current) (fileInputRef.current as HTMLInputElement).value = "";
              } catch (e) {}
              try { fileInputRef.current?.click(); } catch (e) {}
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>
        </div>
      ) : null }
    </div>
  );
}
