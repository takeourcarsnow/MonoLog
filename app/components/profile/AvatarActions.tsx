import { Camera } from "lucide-react";

interface AvatarActionsProps {
  storyUploading: boolean;
  onLiveCamera: () => void;
}

export function AvatarActions({ storyUploading, onLiveCamera }: AvatarActionsProps) {
  return (
    <div className="avatar-actions" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 10 }}>
      <div className="avatar-actions-inner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        onClick={onLiveCamera}
        disabled={storyUploading}
        style={{
          padding: '16px',
          color: 'var(--text)',
          border: 'none',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: storyUploading ? 'not-allowed' : 'pointer',
          background: 'transparent',
          outline: 'none',
          boxShadow: 'none',
          transition: 'var(--transition-fast)',
          animation: storyUploading ? 'none' : 'subtle-pulse 2s ease-in-out infinite',
          opacity: storyUploading ? 0.5 : 1
        }}
        onMouseEnter={(e) => {
          if (!storyUploading) {
            e.currentTarget.style.opacity = '0.7';
            e.currentTarget.style.transform = 'scale(1.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (!storyUploading) {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = '2px solid var(--primary)';
          e.currentTarget.style.outlineOffset = '2px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!storyUploading) onLiveCamera();
          }
        }}
        aria-label="Take photo"
        tabIndex={0}
      >
        {storyUploading ? (
          <div style={{
            width: '40px',
            height: '40px',
            border: '2px solid var(--border)',
            borderTop: '2px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        ) : (
          <Camera size={40} strokeWidth={2} />
        )}
      </button>
      <div className="avatar-action-caption" aria-hidden={false}>Add a Story</div>
      </div>
    </div>
  );
}