"use client";

export default function InlinePreloader() {
  return (
    <div aria-hidden>
      <div className="card skeleton" style={{ height: 120, marginBottom: 12 }} />
      <div className="card skeleton" style={{ height: 120, marginBottom: 12 }} />
      <div className="card skeleton" style={{ height: 120, marginBottom: 12 }} />
    </div>
  );
}
