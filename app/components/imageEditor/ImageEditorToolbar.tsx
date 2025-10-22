import React from 'react';
import './ImageEditorToolbarFix.css';
import ToolbarHeader from './ToolbarHeader';
import ToolbarCategories from './ToolbarCategories';

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

// Default export: compose header + categories (backwards-compatible)
export default function ImageEditorToolbar(props: ImageEditorToolbarProps) {
  return (
    <>
      <ToolbarHeader
        onCancel={props.onCancel}
        resetAdjustments={props.resetAdjustments}
        applyEdit={props.applyEdit}
        isEdited={props.isEdited}
        onToggleFullscreen={props.onToggleFullscreen}
        isFullscreen={props.isFullscreen}
        onDownload={props.onDownload}
      />
      <ToolbarCategories
        categoriesContainerRef={props.categoriesContainerRef}
        selectedCategory={props.selectedCategory}
        setSelectedCategory={props.setSelectedCategory}
        categoryHighlight={props.categoryHighlight}
        sel={props.sel}
        applyCropOnly={props.applyCropOnly}
        resetCrop={props.resetCrop}
        cancelCrop={props.cancelCrop}
      />
    </>
  );
}

// Named exports for individual components
export { default as ImageEditorToolbarHeader } from './ToolbarHeader';
export { default as ImageEditorToolbarCategories } from './ToolbarCategories';
