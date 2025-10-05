import LogoLoader from "./LogoLoader";

interface LoadingBadgeProps {
  processing: boolean;
  previewLoaded: boolean;
}

export function LoadingBadge({ processing, previewLoaded }: LoadingBadgeProps) {
  if (!processing && previewLoaded) return null;

  // When actively processing (replace/confirm edit), show the full overlay
  // identical to the dropzone loader so the visuals are consistent.
  if (processing) {
    return (
      <div className="drop-zone-loader show-blur" role="status" aria-live="polite">
        <LogoLoader size={86} />
        <span style={{ fontSize: 15, fontWeight: 600 }}>Processing image…</span>
      </div>
    );
  }

  // Otherwise show a smaller inline loader for initial preview loading
  return (
    <div className="preview-badge" role="status" aria-live="polite">
      <LogoLoader size={36} />
      <span style={{ marginLeft: 8 }}>Loading…</span>
    </div>
  );
}
