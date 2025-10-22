import { RefreshCw, X, Check, Sliders, Palette, Sparkles, Scissors, ImageIcon, Layers } from "lucide-react";
import { CATEGORY_COLORS } from './constants';
import React from 'react';

interface ToolbarCategoriesProps {
  categoriesContainerRef: React.RefObject<HTMLDivElement>;
  selectedCategory: 'basic' | 'color' | 'effects' | 'crop' | 'frame' | 'overlays';
  setSelectedCategory: (category: 'basic' | 'color' | 'effects' | 'crop' | 'frame' | 'overlays') => void;
  categoryHighlight: { left: number; top: number; width: number; height: number } | null;
  sel: { x: number; y: number; w: number; h: number } | null;
  applyCropOnly: () => void;
  resetCrop: () => void;
  cancelCrop: () => void;
}

function ImageEditorToolbarCategories({
  categoriesContainerRef,
  selectedCategory,
  setSelectedCategory,
  categoryHighlight,
  sel,
  applyCropOnly,
  resetCrop,
  cancelCrop
}: ToolbarCategoriesProps) {
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
        margin: '16px auto 0',
        padding: '4px 5px',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        background: 'color-mix(in srgb, var(--bg-elev) 70%, transparent)',
        borderRadius: 12,
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
        height: 48
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
            padding: '6px 8px',
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
            padding: '6px 8px',
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
            padding: '6px 8px',
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
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
      height: 48
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
    </nav>
  );
}

export const MemoizedImageEditorToolbarCategories = React.memo(ImageEditorToolbarCategories);
export default MemoizedImageEditorToolbarCategories;