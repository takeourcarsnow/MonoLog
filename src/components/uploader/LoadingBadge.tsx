interface LoadingBadgeProps {
  processing: boolean;
  previewLoaded: boolean;
}

export function LoadingBadge({ processing, previewLoaded }: LoadingBadgeProps) {
  if (!processing && previewLoaded) return null;

  return (
    <div className="preview-badge" role="status" aria-live="polite">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2a10 10 0 1 0 10 10" strokeOpacity={0.28} />
          <path d="M12 2a10 10 0 0 0 0 20">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
          </path>
        </g>
      </svg>
      <span>{processing ? 'Processing…' : 'Loading…'}</span>
    </div>
  );
}