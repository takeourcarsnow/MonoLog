function ViewToggle({ title, subtitle, selected, onSelect }: { title: React.ReactNode; subtitle: string; selected: "list" | "grid"; onSelect: (v: "list" | "grid") => void }) {
  return (
    <div className="view-toggle">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <strong>{title}</strong>
        <div className="dim">{subtitle}</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          className="btn btn-no-bg"
          onClick={() => onSelect(selected === "list" ? "grid" : "list")}
          title={selected === "list" ? "Switch to grid view" : "Switch to list view"}
          aria-pressed={selected === "list"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <g style={{ opacity: selected === "list" ? 1 : 0, transition: "opacity 0.3s ease" }}>
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <rect x="3" y="5" width="4" height="4" rx="1" />
              <rect x="3" y="11" width="4" height="4" rx="1" />
              <rect x="3" y="17" width="4" height="4" rx="1" />
            </g>
            <g style={{ opacity: selected === "grid" ? 1 : 0, transition: "opacity 0.3s ease" }}>
              <rect x="3" y="3" width="8" height="8" rx="1" />
              <rect x="13" y="3" width="8" height="8" rx="1" />
              <rect x="3" y="13" width="8" height="8" rx="1" />
              <rect x="13" y="13" width="8" height="8" rx="1" />
            </g>
          </svg>
          <span className="sr-only">{selected === "list" ? "List view" : "Grid view"}</span>
        </button>
      </div>
    </div>
  );
}

export { ViewToggle };
