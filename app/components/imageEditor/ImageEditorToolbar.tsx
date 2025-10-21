import { RefreshCw, X, Check, Sliders, Palette, Sparkles, Scissors, ImageIcon, Fullscreen, Sun, Download, Layers } from "lucide-react";
import { CATEGORY_COLORS } from './constants';
import React from 'react';

interface ImageEditorToolbarProps {
  onCancel: () => void;
  resetAdjustments: () => void;
  applyEdit: () => void;
  isEdited: boolean;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onDownload?: () => void;
  categoriesContainerRef: React.RefObject<HTMLDivElement>;
  selectedCategory: 'basic' | 'color' | 'effects' | 'crop' | 'frame' | 'overlays';
  setSelectedCategory: (category: 'basic' | 'color' | 'effects' | 'crop' | 'frame' | 'overlays') => void;
  categoryHighlight: { left: number; top: number; width: number; height: number } | null;
  sel: { x: number; y: number; w: number; h: number } | null;
  applyCropOnly: () => void;
  resetCrop: () => void;
  cancelCrop: () => void;
}

function ImageEditorToolbarHeader({
  onCancel,
  resetAdjustments,
  applyEdit,
  isEdited,
  onToggleFullscreen,
  isFullscreen,
  onDownload
}: Pick<ImageEditorToolbarProps, 'onCancel' | 'resetAdjustments' | 'applyEdit' | 'isEdited' | 'onToggleFullscreen' | 'isFullscreen' | 'onDownload'>) {
  return (
    <header className="image-editor-header" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, flexWrap: 'wrap', padding: '0px 0' }}>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
        <span className="sr-only">Edit Photo</span>
      </div>
      <nav className="image-editor-buttons" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
        <button type="button" className="btn icon ghost" onClick={onCancel} aria-label="Cancel edits">
          <X size={14} aria-hidden />
          <span className="sr-only">Cancel edits</span>
        </button>

        <button type="button" className={`btn icon ghost`} onClick={applyEdit} aria-pressed={isEdited} aria-label="Confirm edits" title="Confirm edits">
          <Check size={14} aria-hidden />
          <span className="sr-only">Confirm edits</span>
        </button>

        <button type="button" className="btn icon ghost" onClick={onDownload} aria-label="Download edited photo" title="Download edited photo">
          <Download size={14} aria-hidden />
          <span className="sr-only">Download edited photo</span>
        </button>

        <button type="button" className="btn icon ghost" title="Reset adjustments" onClick={resetAdjustments} aria-label="Reset adjustments">
          <RefreshCw size={14} aria-hidden />
          <span className="sr-only">Reset adjustments</span>
        </button>

        <button
          type="button"
          className={`btn icon ghost${isFullscreen ? " active" : ""}`}
          title={isFullscreen ? "Exit Fullscreen" : "View in Fullscreen"}
          aria-label={isFullscreen ? "Exit Fullscreen" : "View in Fullscreen"}
          onClick={onToggleFullscreen}
        >
          <Fullscreen size={14} aria-hidden />
          <span className="sr-only">{isFullscreen ? "Exit Fullscreen" : "View in Fullscreen"}</span>
        </button>
      </nav>
    </header>
  );
}

const MemoizedImageEditorToolbarHeader = React.memo(ImageEditorToolbarHeader);

function ImageEditorToolbarCategories({
  categoriesContainerRef,
  selectedCategory,
  setSelectedCategory,
  categoryHighlight,
  sel,
  applyCropOnly,
  resetCrop,
  cancelCrop
}: Pick<ImageEditorToolbarProps, 'categoriesContainerRef' | 'selectedCategory' | 'setSelectedCategory' | 'categoryHighlight' | 'sel' | 'applyCropOnly' | 'resetCrop' | 'cancelCrop'>) {
  const category = selectedCategory;

  // When in crop mode, show Confirm/Reset/Cancel buttons
  if (category === 'crop') {
    return (
      <nav ref={categoriesContainerRef} className="categories-scroll" style={{
        position: 'relative',
        display: 'flex',
        gap: 6,
        marginTop: 8,
        justifyContent: 'center',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        maxWidth: 820,
        margin: '8px auto 0',
        padding: '8px 10px',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        background: 'color-mix(in srgb, var(--bg-elev) 70%, transparent)',
        borderRadius: 12,
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
      }}>
        <button
          type="button"
          aria-label="Confirm Crop"
          title="Confirm Crop"
          onClick={(e: any) => {
            try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {}
            applyCropOnly();
          }}
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
            color: 'var(--text)',
            transition: 'transform 140ms ease, box-shadow 220ms ease, background 140ms ease',
            position: 'relative',
            zIndex: 1,
            flex: '0 0 auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid color-mix(in srgb, var(--text) 6%, transparent)',
            fontWeight: 600,
            overflow: 'hidden',
            cursor: 'pointer'
          }}
        >
          <Check size={20} strokeWidth={2} aria-hidden />
          <span style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Confirm</span>
        </button>

        <button
          type="button"
          aria-label="Reset Crop"
          title="Reset Crop"
          onClick={(e: any) => {
            try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {}
            resetCrop();
          }}
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            background: 'transparent',
            color: 'var(--text)',
            transition: 'transform 140ms ease, box-shadow 220ms ease, background 140ms ease',
            position: 'relative',
            zIndex: 1,
            flex: '0 0 auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid color-mix(in srgb, var(--text) 4%, transparent)',
            fontWeight: 500,
            overflow: 'hidden',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={20} strokeWidth={2} aria-hidden />
          <span style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Reset</span>
        </button>

        <button
          type="button"
          aria-label="Cancel Crop"
          title="Cancel Crop"
          onClick={(e: any) => {
            try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {}
            cancelCrop();
          }}
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            background: 'transparent',
            color: 'var(--text)',
            transition: 'transform 140ms ease, box-shadow 220ms ease, background 140ms ease',
            position: 'relative',
            zIndex: 1,
            flex: '0 0 auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid color-mix(in srgb, var(--text) 4%, transparent)',
            fontWeight: 500,
            overflow: 'hidden',
            cursor: 'pointer'
          }}
        >
          <X size={20} strokeWidth={2} aria-hidden />
          <span style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Cancel</span>
        </button>
      </nav>
    );
  }

  // Normal category buttons
  return (
    <nav ref={categoriesContainerRef} className="categories-scroll" style={{
      position: 'relative',
      display: 'flex',
      gap: 3,
      marginTop: 8,
      justifyContent: 'center',
      flexWrap: 'wrap',
      overflowX: 'visible',
      maxWidth: 'none',
      margin: '16px auto 0',
      padding: '4px 5px',
      alignItems: 'center',
      whiteSpace: 'nowrap',
      background: 'color-mix(in srgb, var(--bg-elev) 70%, transparent)',
      borderRadius: 12,
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)'
    }}>
      <div aria-hidden style={{
        position: 'absolute',
        left: categoryHighlight?.left ?? 0,
        top: categoryHighlight?.top ?? 0,
        width: categoryHighlight?.width ?? 0,
        height: categoryHighlight?.height ?? 0,
        borderRadius: 8,
        background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
        transition: 'left 220ms cubic-bezier(.2,.9,.2,1), width 220ms cubic-bezier(.2,.9,.2,1), top 220ms cubic-bezier(.2,.9,.2,1), height 220ms cubic-bezier(.2,.9,.2,1), opacity 160ms ease',
        pointerEvents: 'none',
        opacity: categoryHighlight ? 0.95 : 0,
        zIndex: 0,
        boxShadow: 'none',
        border: '1px solid color-mix(in srgb, var(--text) 6%, transparent)'
      }} />

      <button
        data-cat="basic"
        data-active={category === 'basic'}
        type="button"
        aria-label="Basic"
        title="Basic"
        className="cat-btn"
        onClick={(e: any) => {
          try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {}
          setSelectedCategory('basic');
        }}
        style={{
          padding: '6px 8px',
          borderRadius: 10,
          background: category === 'basic' ? 'transparent' : 'transparent',
          color: 'var(--text)',
          transition: 'transform 140ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease',
          position: 'relative',
          zIndex: 1,
          flex: '0 0 auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: 'none',
          fontWeight: category === 'basic' ? 700 : 500,
          overflow: 'hidden'
        }}
      >
        <Sliders size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0, color: category === 'basic' ? CATEGORY_COLORS.basic : undefined }} />
        <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Basic</span>
      </button>

      <button
        data-cat="color"
        data-active={category === 'color'}
        type="button"
        aria-label="Filters"
        title="Filters"
        className="cat-btn"
        onClick={(e: any) => {
          try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {}
          setSelectedCategory('color');
        }}
        style={{
          padding: '6px 8px',
          borderRadius: 10,
          background: category === 'color' ? 'transparent' : 'transparent',
          color: 'var(--text)',
          transition: 'transform 140ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease',
          position: 'relative',
          zIndex: 1,
          flex: '0 0 auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: 'none',
          fontWeight: category === 'color' ? 700 : 500,
          overflow: 'hidden'
        }}
      >
        <Palette size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0, color: category === 'color' ? CATEGORY_COLORS.color : undefined }} />
        <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Filters</span>
      </button>

      <button
        data-cat="effects"
        data-active={category === 'effects'}
        type="button"
        aria-label="Effects"
        title="Effects"
        className="cat-btn"
        onClick={(e: any) => {
          try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {}
          setSelectedCategory('effects');
        }}
        style={{
          padding: '6px 8px',
          borderRadius: 10,
          background: category === 'effects' ? 'transparent' : 'transparent',
          color: 'var(--text)',
          transition: 'transform 140ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease',
          position: 'relative',
          zIndex: 1,
          flex: '0 0 auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: 'none',
          fontWeight: category === 'effects' ? 700 : 500,
          overflow: 'hidden'
        }}
      >
        <Sparkles size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0, color: category === 'effects' ? CATEGORY_COLORS.effects : undefined }} />
        <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Effects</span>
      </button>

      <button
        data-cat="crop"
        data-active={false}
        type="button"
        aria-label="Crop"
        title="Crop"
        className="cat-btn"
        onClick={(e: any) => {
          try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {}
          setSelectedCategory('crop');
        }}
        style={{
          padding: '6px 8px',
          borderRadius: 10,
          background: 'transparent',
          color: 'var(--text)',
          transition: 'transform 120ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease',
          position: 'relative',
          zIndex: 1,
          flex: '0 0 auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: 'none',
          fontWeight: 500,
          overflow: 'hidden'
        }}
      >
        <Scissors size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0, color: undefined }} />
        <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Crop</span>
      </button>

      <button
        data-cat="frame"
        data-active={category === 'frame'}
        type="button"
        aria-label="Frame"
        title="Frame"
        className="cat-btn"
        onClick={(e: any) => {
          try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {}
          setSelectedCategory('frame');
        }}
        style={{
          padding: '6px 8px',
          borderRadius: 10,
          background: category === 'frame' ? 'transparent' : 'transparent',
          color: 'var(--text)',
          transition: 'transform 120ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease',
          position: 'relative',
          zIndex: 1,
          flex: '0 0 auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: 'none',
          fontWeight: category === 'frame' ? 700 : 500,
          overflow: 'hidden'
        }}
      >
        <ImageIcon size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0, color: category === 'frame' ? CATEGORY_COLORS.frame : undefined }} />
        <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Frame</span>
      </button>

      <button
        data-cat="overlays"
        data-active={category === 'overlays'}
        type="button"
        aria-label="Overlays"
        title="Overlays"
        className="cat-btn"
        onClick={(e: any) => {
          try { e.currentTarget.animate([{ transform: 'scale(0.94)' }, { transform: 'scale(1)' }], { duration: 240, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch {}
          setSelectedCategory('overlays');
        }}
        style={{
          padding: '6px 8px',
          borderRadius: 10,
          background: category === 'overlays' ? 'transparent' : 'transparent',
          color: 'var(--text)',
          transition: 'transform 140ms ease, box-shadow 220ms ease, color 220ms ease, width 200ms ease',
          position: 'relative',
          zIndex: 1,
          flex: '0 0 auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: 'none',
          fontWeight: category === 'overlays' ? 700 : 500,
          overflow: 'hidden'
        }}
      >
        <Layers size={20} strokeWidth={2} aria-hidden style={{ flexShrink: 0, color: category === 'overlays' ? '#ff6b6b' : undefined }} />
        <span className="cat-label" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>Overlays</span>
      </button>
    </nav>
  );
}

const MemoizedImageEditorToolbarCategories = React.memo(ImageEditorToolbarCategories);// Default export: compose header + categories (backwards-compatible)
export default function ImageEditorToolbar(props: ImageEditorToolbarProps) {
  return (
    <>
      <MemoizedImageEditorToolbarHeader onCancel={props.onCancel} resetAdjustments={props.resetAdjustments} applyEdit={props.applyEdit} isEdited={props.isEdited} onToggleFullscreen={props.onToggleFullscreen} isFullscreen={props.isFullscreen} onDownload={props.onDownload} />
      <MemoizedImageEditorToolbarCategories categoriesContainerRef={props.categoriesContainerRef} selectedCategory={props.selectedCategory} setSelectedCategory={props.setSelectedCategory} categoryHighlight={props.categoryHighlight} sel={props.sel} applyCropOnly={props.applyCropOnly} resetCrop={props.resetCrop} cancelCrop={props.cancelCrop} />
    </>
  );
}

export { MemoizedImageEditorToolbarHeader as ImageEditorToolbarHeader, MemoizedImageEditorToolbarCategories as ImageEditorToolbarCategories };
