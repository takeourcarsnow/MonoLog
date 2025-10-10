"use client";

import { LayoutGrid, LayoutList } from "lucide-react";

function ViewToggle({ title, subtitle, selected, onSelect }: { title: React.ReactNode; subtitle: string; selected: "list" | "grid"; onSelect: (v: "list" | "grid") => void }) {
  return (
    <div className="view-toggle">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <strong>{title}</strong>
        <div className="dim">{subtitle}</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          className="btn btn-no-bg view-btn"
          onClick={() => onSelect(selected === "list" ? "grid" : "list")}
          title={selected === "list" ? "Switch to grid view" : "Switch to list view"}
          aria-pressed={selected === "list"}
        >
          {selected === "list" ? <LayoutList size={18} strokeWidth={1} /> : <LayoutGrid size={18} strokeWidth={1} />}
          <span className="sr-only">{selected === "list" ? "List view" : "Grid view"}</span>
        </button>
      </div>
    </div>
  );
}

export { ViewToggle };
