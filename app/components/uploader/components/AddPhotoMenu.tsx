import Portal from "@/app/components/ui/Portal";

interface AddPhotoMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFromCameraEffects: () => void;
  onAddFromCamera: () => void;
  onAddFromFile: () => void;
  processing: boolean;
}

export function AddPhotoMenu({
  isOpen,
  onClose,
  onAddFromCameraEffects,
  onAddFromCamera,
  onAddFromFile,
  processing,
}: AddPhotoMenuProps) {
  if (!isOpen) return null;

  return (
    <Portal>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
          zIndex: 20,
          background: 'rgba(0,0,0,0.85)',
        }}
        onClick={onClose}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            background: 'var(--bg)',
            borderRadius: 8,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, textAlign: 'center' }}>Add Photo</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={onAddFromCameraEffects}
              disabled={processing}
              style={{ width: '100%', justifyContent: 'flex-start', gap: 12 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 7h3l2-2h6l2 2h3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 3l2 2m0 0l-2 2m2-2h-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Camera with Effects</span>
            </button>
            <button
              type="button"
              className="btn"
              onClick={onAddFromCamera}
              disabled={processing}
              style={{ width: '100%', justifyContent: 'flex-start', gap: 12 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 7h3l2-2h6l2 2h3v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Quick Camera</span>
            </button>
            <button
              type="button"
              className="btn"
              onClick={onAddFromFile}
              disabled={processing}
              style={{ width: '100%', justifyContent: 'flex-start', gap: 12 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Choose from Device</span>
            </button>
          </div>
          <button
            type="button"
            className="btn ghost"
            onClick={onClose}
            style={{ width: '100%', marginTop: 4 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </Portal>
  );
}