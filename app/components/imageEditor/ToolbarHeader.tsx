import { RefreshCw, X, Check, Download, Fullscreen, Sun, Moon, Camera } from "lucide-react";
import React from 'react';
import { currentTheme } from '@/lib/theme';

interface ToolbarHeaderProps {
  onCancel: () => void;
  resetAdjustments: () => void;
  applyEdit: () => void;
  isEdited: boolean;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onDownload?: () => void;
  onToggleTheme?: () => void;
  onCamera?: () => void;
}

function ImageEditorToolbarHeader({
  onCancel,
  resetAdjustments,
  applyEdit,
  isEdited,
  onToggleFullscreen,
  isFullscreen,
  onDownload,
  onToggleTheme,
  onCamera
}: ToolbarHeaderProps) {
  const currentThemeValue = currentTheme();
  const ThemeIcon = currentThemeValue === 'light' ? Sun : Moon;
  return (
    <header className="image-editor-header" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, flexWrap: 'wrap', padding: '0px 0' }}>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
        <span className="sr-only">Edit Photo</span>
      </div>
      <nav className="image-editor-buttons" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
        <button type="button" className="btn icon ghost no-tap-effects" onClick={onCancel} aria-label="Cancel edits">
          <X size={14} aria-hidden />
          <span className="sr-only">Cancel edits</span>
        </button>

        <button type="button" className="btn icon ghost no-tap-effects" onClick={onDownload} aria-label="Download edited photo" title="Download edited photo">
          <Download size={14} aria-hidden />
          <span className="sr-only">Download edited photo</span>
        </button>

        {onCamera && (
          <button type="button" className="btn icon ghost no-tap-effects" onClick={onCamera} aria-label="Take photo with camera" title="Take photo with camera">
            <Camera size={14} aria-hidden />
            <span className="sr-only">Take photo with camera</span>
          </button>
        )}

        <button type="button" className="btn icon ghost no-tap-effects" title="Reset adjustments" onClick={resetAdjustments} aria-label="Reset adjustments">
          <RefreshCw size={14} aria-hidden />
          <span className="sr-only">Reset adjustments</span>
        </button>

        <button
          type="button"
          className={`btn icon ghost no-tap-effects${isFullscreen ? " active" : ""}`}
          title={isFullscreen ? "Exit Fullscreen" : "View in Fullscreen"}
          aria-label={isFullscreen ? "Exit Fullscreen" : "View in Fullscreen"}
          onClick={onToggleFullscreen}
        >
          <Fullscreen size={14} aria-hidden />
          <span className="sr-only">{isFullscreen ? "Exit Fullscreen" : "View in Fullscreen"}</span>
        </button>

        <button
          type="button"
          className="btn icon ghost no-tap-effects"
          title="Toggle theme"
          aria-label="Toggle theme"
          onClick={onToggleTheme}
        >
          <ThemeIcon size={14} aria-hidden />
          <span className="sr-only">Toggle theme</span>
        </button>

        <button type="button" className={`btn icon ghost no-tap-effects`} onClick={applyEdit} aria-pressed={isEdited} aria-label="Confirm edits" title="Confirm edits">
          <Check size={14} aria-hidden />
          <span className="sr-only">Confirm edits</span>
        </button>
      </nav>
    </header>
  );
}

export const MemoizedImageEditorToolbarHeader = React.memo(ImageEditorToolbarHeader);
export default MemoizedImageEditorToolbarHeader;