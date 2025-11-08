"use client";

import React from "react";
import { FILTER_PRESETS, FILTER_COLORS } from "../imageEditor/effectsConfig";
import { FILTER_ICONS } from "../imageEditor/constants";
import { EffectSlider } from "./EffectSlider";
import { rangeBg } from "../imageEditor/utils";

interface FilterPanelProps {
  selectedFilter: string;
  filterStrength: number;
  onChange: (key: string, value: string | number) => void;
  onReset?: (key: string) => void;
  disabled?: boolean;
  selectedFilterRef?: React.MutableRefObject<string>;
  filterStrengthRef?: React.MutableRefObject<number>;
  filtersContainerRef?: React.RefObject<HTMLDivElement | null>;
  filterHighlight?: { left: number; top: number; width: number; height: number } | null;
  announce?: boolean;
}

export function FilterPanel({
  selectedFilter,
  filterStrength,
  onChange,
  onReset,
  disabled = false,
  selectedFilterRef,
  filterStrengthRef,
  filtersContainerRef,
  filterHighlight,
  announce = false,
}: FilterPanelProps) {
  const colorFilters = ['portra', 'velvia', 'provia', 'ektar', 'astia', 'ektachrome', 'gold'];
  const bwFilters = ['trix', 'hp5', 'delta', 'scala', 'fp4', 'tmax', 'panatomic'];
  const otherFilters = ['none', 'invert'];

  const handleFilterSelect = (filter: string) => {
    if (selectedFilterRef) selectedFilterRef.current = filter;
    onChange('selectedFilter', filter);
  };

  const renderFilterGroup = (filters: string[], flexWrap: 'wrap' | 'nowrap' | 'wrap-reverse' = 'wrap') => (
    <div style={{ marginBottom: 2 }}>
      <div className="filter-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap }}>
        {filters.map(f => {
          const Icon = FILTER_ICONS[f] || FILTER_ICONS.default;
          return (
            <button
              key={f}
              data-filter={f}
              type="button"
              className="filter-btn"
              onClick={() => handleFilterSelect(f)}
              onMouseDownCapture={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
              onMouseUpCapture={(e) => (e.currentTarget.style.transform = '')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
              onFocus={(e) => (e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)')}
              onBlur={(e) => (e.currentTarget.style.boxShadow = '')}
              aria-pressed={selectedFilter === f}
              disabled={disabled}
            >
              <Icon size={14} strokeWidth={2} aria-hidden style={{ color: selectedFilter === f ? FILTER_COLORS[f] ?? undefined : undefined }} />
              <span>{f}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <section className="imgedit-panel-inner" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <nav ref={filtersContainerRef} style={{ flex: 1, position: 'relative' }}>
        <div aria-hidden style={{
          position: 'absolute',
          left: filterHighlight?.left ?? 0,
          top: filterHighlight?.top ?? 0,
          width: filterHighlight?.width ?? 0,
          height: filterHighlight?.height ?? 0,
          borderRadius: 8,
          background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
          transition: 'left 220ms cubic-bezier(.2,.9,.2,1), width 220ms cubic-bezier(.2,.9,.2,1), top 220ms cubic-bezier(.2,.9,.2,1), height 220ms cubic-bezier(.2,.9,.2,1), opacity 160ms ease',
          pointerEvents: 'none',
          opacity: filterHighlight ? 0.95 : 0,
          boxShadow: 'none',
          border: '1px solid color-mix(in srgb, var(--text) 6%, transparent)'
        }} />
        {renderFilterGroup(colorFilters, 'wrap')}
        {renderFilterGroup(bwFilters, 'wrap')}
        {renderFilterGroup(otherFilters)}
      </nav>

      <div style={{ marginTop: 2, flexShrink: 0 }}>
        <EffectSlider
          label="Strength"
          value={filterStrength}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => onChange('filterStrength', v)}
          onDoubleClick={onReset ? () => onReset('filterStrength') : undefined}
          disabled={disabled}
          showValue={false}
          colorLeft="#2d9cff"
          colorRight="#ffd166"
          announce={announce}
          prevValueRef={filterStrengthRef}
        />
      </div>
    </section>
  );
}