import { FILTER_PRESETS, FILTER_ICONS, FILTER_COLORS } from "../constants";
import { rangeBg } from "../utils";

interface ColorPanelProps {
  selectedFilter: string;
  setSelectedFilter: (f: string) => void;
  selectedFilterRef: React.MutableRefObject<string>;
  filterStrength: number;
  setFilterStrength: (v: number) => void;
  filterStrengthRef: React.MutableRefObject<number>;
  draw: (overrides?: any) => void;
  resetControlToDefault: (control: string) => void;
  filtersContainerRef: React.RefObject<HTMLDivElement>;
  filterHighlight: { left: number; top: number; width: number; height: number } | null;
}

export default function ColorPanel({
  selectedFilter,
  setSelectedFilter,
  selectedFilterRef,
  filterStrength,
  setFilterStrength,
  filterStrengthRef,
  draw,
  resetControlToDefault,
  filtersContainerRef,
  filterHighlight,
}: ColorPanelProps) {
  return (
    <section className="imgedit-panel-inner" style={{ display: 'grid', width: '100%' }}>
      {/* panel heading removed (tab already shows Filters) */}
      <nav ref={filtersContainerRef} style={{ position: 'relative', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', padding: '8px 0' }}>
        {/* animated highlight pill sits behind buttons and moves between them */}
        <div aria-hidden style={{ position: 'absolute', left: filterHighlight?.left ?? 0, top: filterHighlight?.top ?? 0, width: filterHighlight?.width ?? 0, height: filterHighlight?.height ?? 0, borderRadius: 8, background: 'color-mix(in srgb, var(--primary) 10%, transparent)', transition: 'left 220ms cubic-bezier(.2,.9,.2,1), width 220ms cubic-bezier(.2,.9,.2,1), top 220ms cubic-bezier(.2,.9,.2,1), height 220ms cubic-bezier(.2,.9,.2,1), opacity 160ms ease', pointerEvents: 'none', opacity: filterHighlight ? 0.95 : 0, boxShadow: 'none', border: '1px solid color-mix(in srgb, var(--text) 6%, transparent)' }} />
        {Object.keys(FILTER_PRESETS).map(f => {
          const Icon = FILTER_ICONS[f] || FILTER_ICONS.default;
          return (
            <button
              key={f}
              data-filter={f}
              type="button"
              onMouseDown={() => { selectedFilterRef.current = f; setSelectedFilter(f); draw({ selectedFilter: f }); requestAnimationFrame(() => draw()); }}
              style={{ padding: '8px 12px', borderRadius: 10, background: 'transparent', color: 'var(--text)', transition: 'transform 120ms ease, box-shadow 200ms ease, color 200ms ease', display: 'inline-flex', gap: 8, alignItems: 'center', position: 'relative', zIndex: 1, border: 'none', fontWeight: selectedFilter === f ? 700 : 500 }}
              onMouseDownCapture={(e)=> (e.currentTarget.style.transform = 'scale(0.96)')}
              onMouseUpCapture={(e)=> (e.currentTarget.style.transform = '')}
              onMouseLeave={(e)=> (e.currentTarget.style.transform = '')}
              onFocus={(e)=> (e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)')}
              onBlur={(e)=> (e.currentTarget.style.boxShadow = '')}
              aria-pressed={selectedFilter===f}
            >
              <Icon size={18} strokeWidth={2} aria-hidden style={{ color: selectedFilter === f ? FILTER_COLORS[f] ?? undefined : undefined }} />
              <span style={{ fontSize: 13 }}>{f}</span>
            </button>
          );
        })}
      </nav>

      <fieldset style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
        <span style={{ width: 120, color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>Strength</span>
        <input
          className="imgedit-range"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={filterStrength}
          onInput={(e: any) => {
            const v = Number(e.target.value);
            filterStrengthRef.current = v;
            setFilterStrength(v);
            requestAnimationFrame(() => draw());
          }}
          onDoubleClick={() => resetControlToDefault('filterStrength')}
          style={{ flex: 1, background: rangeBg(filterStrength, 0, 1, 'var(--slider-heat-start)', 'var(--slider-heat-end)') }}
        />
      </fieldset>
    </section>
  );
}
